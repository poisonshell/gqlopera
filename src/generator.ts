import * as fs from 'fs-extra';
import * as path from 'path';
import { GraphQLClient } from 'graphql-request';
import { buildClientSchema, getIntrospectionQuery, IntrospectionQuery } from 'graphql';
import ora from 'ora';
import { DocGenConfig } from './types';
import { logger } from './utils/logger';

export class DocGenerator {
  private client: GraphQLClient;

  constructor(private config: DocGenConfig) {
    this.client = new GraphQLClient(config.endpoint, {
      headers: config.headers || {},
    });
  }

  async generate(): Promise<void> {
    const spinner = ora('Fetching GraphQL schema...').start();

    try {
      // Fetch schema via introspection
      const introspectionResult = await this.fetchSchema();
      spinner.text = 'Generating documentation...';
      
      // Generate individual operation files
      await this.generateIndividualOperationFiles(introspectionResult);
      
      spinner.succeed('Documentation generated successfully!');
      logger.success(`📚 Documentation saved to: ${this.config.output}`);
    } catch (error) {
      spinner.fail('Failed to generate documentation');
      throw error;
    }
  }

  async validate(): Promise<void> {
    try {
      await this.fetchSchema();
      logger.success('✅ GraphQL endpoint is accessible and schema is valid');
    } catch (error) {
      throw new Error(`GraphQL endpoint validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async watch(): Promise<void> {
    // Simple polling-based watch implementation
    let lastSchemaHash = '';
    
    const checkForChanges = async () => {
      try {
        const introspectionResult = await this.fetchSchema();
        const currentHash = this.hashSchema(introspectionResult);
        
        if (lastSchemaHash && lastSchemaHash !== currentHash) {
          logger.info('🔄 Schema change detected, regenerating...');
          await this.generateIndividualOperationFiles(introspectionResult);
          logger.success('✅ Documentation updated!');
        }
        
        lastSchemaHash = currentHash;
      } catch (error) {
        logger.error('❌ Error during watch:', error instanceof Error ? error.message : String(error));
      }
    };

    // Initial check
    await checkForChanges();
    
    // Check every 5 seconds
    setInterval(checkForChanges, 5000);
  }

  private async fetchSchema(): Promise<IntrospectionQuery> {
    try {
      const introspectionQuery = getIntrospectionQuery();
      const result = await this.client.request(introspectionQuery);
      return result as IntrospectionQuery;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('Authentication failed. Check your headers/credentials.');
      } else if (error?.response?.status === 404) {
        throw new Error('GraphQL endpoint not found. Check your endpoint URL.');
      } else if (error?.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. Make sure the GraphQL server is running.');
      }
      throw new Error(`Failed to fetch schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateIndividualOperationFiles(introspection: IntrospectionQuery): Promise<void> {
    // Ensure output directory exists
    await fs.ensureDir(this.config.output);
    
    const schema = buildClientSchema(introspection);
    
    // Create directories
    const queryDir = path.join(this.config.output, 'query');
    const mutationDir = path.join(this.config.output, 'mutation');
    const subscriptionDir = path.join(this.config.output, 'subscription');
    
    await fs.ensureDir(queryDir);
    await fs.ensureDir(mutationDir);
    await fs.ensureDir(subscriptionDir);

    // Generate individual query files
    const queryType = schema.getQueryType();
    if (queryType) {
      const fields = Object.values(queryType.getFields());
      for (const field of fields) {
        const operationContent = this.generateOperationContent(field, 'query');
        const filePath = path.join(queryDir, `${field.name}.graphql`);
        await fs.writeFile(filePath, operationContent);
      }
      logger.info(`📄 Generated ${fields.length} query files`);
    }

    // Generate individual mutation files
    const mutationType = schema.getMutationType();
    if (mutationType) {
      const fields = Object.values(mutationType.getFields());
      for (const field of fields) {
        const operationContent = this.generateOperationContent(field, 'mutation');
        const filePath = path.join(mutationDir, `${field.name}.graphql`);
        await fs.writeFile(filePath, operationContent);
      }
      logger.info(`📄 Generated ${fields.length} mutation files`);
    }

    // Generate individual subscription files
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) {
      const fields = Object.values(subscriptionType.getFields());
      for (const field of fields) {
        const operationContent = this.generateOperationContent(field, 'subscription');
        const filePath = path.join(subscriptionDir, `${field.name}.graphql`);
        await fs.writeFile(filePath, operationContent);
      }
      logger.info(`📄 Generated ${fields.length} subscription files`);
    }
  }

  private generateOperationContent(field: any, operationType: string): string {
    const operationName = this.toPascalCase(field.name);
    const fieldDescription = field.description ? `# ${field.description}\n` : '';
    
    // Generate variables from arguments
    const variables = field.args.length > 0 ? 
      `(${field.args.map((arg: any) => `$${arg.name}: ${arg.type.toString()}`).join(', ')})` : '';
    
    // Generate field arguments using variables
    const fieldArgs = field.args.length > 0 ? 
      `(${field.args.map((arg: any) => `${arg.name}: $${arg.name}`).join(', ')})` : '';
    
    // Generate selection set for the return type
    const selectionSet = this.generateSelectionSet(field.type);
    
    const deprecated = field.deprecationReason ? `\n# @deprecated: ${field.deprecationReason}` : '';
    
    return `${fieldDescription}${operationType} ${operationName}${variables} {
  ${field.name}${fieldArgs}${selectionSet}
}${deprecated}\n`;
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateSelectionSet(type: any, depth: number = 0, visited: Set<string> = new Set(), fieldPath: string = ''): string {
    const maxDepth = this.config.maxDepth || 3;
    const maxFields = this.config.maxFields || 50;
    const circularRefs = this.config.circularRefs || 'skip';
    const circularRefDepth = this.config.circularRefDepth || 1;

    // Prevent infinite recursion based on configured max depth
    if (depth >= maxDepth) {
      return ` # Max depth (${maxDepth}) reached`;
    }
    
    const actualType = this.unwrapGraphQLType(type);
    
    // Handle scalar types
    if (!actualType || this.isScalarType(actualType.name)) {
      return '';
    }

    // Handle circular references with depth control
    if (visited.has(actualType.name)) {
      if (circularRefs === 'allow' && depth < circularRefDepth) {
        // Allow circular refs up to specified depth
        const circularTypeDepth = this.config.circularRefTypes?.[actualType.name] || circularRefDepth;
        if (depth < circularTypeDepth) {
          // Continue with limited depth for this circular type
          const newVisited = new Set(visited);
          return this.generateSelectionSetForCircularType(actualType, depth, newVisited, fieldPath);
        }
      }
      
      if (circularRefs === 'skip') {
        return ` # Circular reference to ${actualType.name} skipped`;
      } else {
        return ''; // Skip silently if circularRefs === 'silent'
      }
    }
    
    // Track this type to detect circular references
    const newVisited = new Set(visited);
    newVisited.add(actualType.name);

    // Get fields from the GraphQL type
    const fields = actualType.getFields ? actualType.getFields() : null;
    if (!fields) {
      return '';
    }

    const indent = '  '.repeat(depth + 1);
    const nextIndent = '  '.repeat(depth + 2);
    
    // Get all non-introspection fields
    const allFields = Object.values(fields).filter((f: any) => !f.name.startsWith('__'));
    
    // Limit fields if configured
    const fieldsToProcess = allFields.slice(0, maxFields);
    const hasMoreFields = allFields.length > maxFields;
    
    const fieldSelections: string[] = [];
    
    fieldsToProcess.forEach((f: any, index: number) => {
      const fieldTypeName = this.unwrapGraphQLType(f.type)?.name || 'Unknown';
      const currentPath = fieldPath ? `${fieldPath}.${f.name}` : f.name;
      
      // Check if this field would create a problematic circular reference
      if (visited.has(fieldTypeName) && circularRefs !== 'allow') {
        if (circularRefs === 'skip') {
          fieldSelections.push(`${nextIndent}${f.name} # Circular reference to ${fieldTypeName}`);
        }
        return;
      }
      
      const nestedSelection = this.generateSelectionSet(f.type, depth + 1, newVisited, currentPath);
      
      if (nestedSelection && nestedSelection.trim()) {
        fieldSelections.push(`${nextIndent}${f.name}${nestedSelection}`);
      } else {
        fieldSelections.push(`${nextIndent}${f.name}`);
      }
      
      // Add truncation comment immediately after the last included field
      if (hasMoreFields && index === fieldsToProcess.length - 1) {
        fieldSelections.push(`${nextIndent}# ... ${allFields.length - maxFields} more fields (limited by maxFields: ${maxFields})`);
      }
    });

    const selectionContent = fieldSelections.filter(Boolean).join('\n');
    
    if (!selectionContent) return '';
    
    return ` {\n${selectionContent}\n${indent}}`;
  }

  private generateSelectionSetForCircularType(type: any, depth: number, visited: Set<string>, fieldPath: string): string {
    const maxFields = this.config.maxFields || 50;
    const circularRefDepth = this.config.circularRefDepth || 1;
    
    // Get fields from the GraphQL type
    const fields = type.getFields ? type.getFields() : null;
    if (!fields) {
      return '';
    }

    const indent = '  '.repeat(depth + 1);
    const nextIndent = '  '.repeat(depth + 2);
    
    // Get all non-introspection fields
    const allFields = Object.values(fields).filter((f: any) => !f.name.startsWith('__'));
    
    // Limit fields if configured
    const fieldsToProcess = allFields.slice(0, maxFields);
    const hasMoreFields = allFields.length > maxFields;
    
    const fieldSelections: string[] = [];
    
    fieldsToProcess.forEach((f: any, index: number) => {
      const fieldTypeName = this.unwrapGraphQLType(f.type)?.name || 'Unknown';
      
      // For circular types, only include scalar fields or stop at depth limit
      if (depth >= circularRefDepth || this.isScalarType(fieldTypeName)) {
        fieldSelections.push(`${nextIndent}${f.name}`);
      } else {
        // Don't recurse further for circular types
        fieldSelections.push(`${nextIndent}${f.name} # Circular ref depth limit`);
      }
      
      // Add truncation comment immediately after the last included field
      if (hasMoreFields && index === fieldsToProcess.length - 1) {
        fieldSelections.push(`${nextIndent}# ... ${allFields.length - maxFields} more fields (limited by maxFields: ${maxFields})`);
      }
    });

    const selectionContent = fieldSelections.filter(Boolean).join('\n');
    
    if (!selectionContent) return '';
    
    return ` {\n${selectionContent}\n${indent}}`;
  }

  private unwrapGraphQLType(type: any): any {
    if (!type) return null;
    
    // Handle GraphQL wrapper types
    if (type.ofType) {
      return this.unwrapGraphQLType(type.ofType);
    }
    
    return type;
  }

  private isScalarType(typeName: string): boolean {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID', 'DateTime', 'Date', 'JSON'];
    return scalarTypes.includes(typeName);
  }

  private hashSchema(schema: IntrospectionQuery): string {
    // Simple hash function for schema comparison
    return Buffer.from(JSON.stringify(schema)).toString('base64');
  }
} 