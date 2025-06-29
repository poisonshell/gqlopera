module.exports = {
  // Your local GraphQL server
  endpoint: 'http://localhost:4000/graphql',
  
  // Output directory
  output: 'generated-schema',
  
  // Output format (separate files)
  format: 'graphql',
  
  // Include deprecated fields
  includeDeprecated: true,
  
  // Include GraphQL directives
  includeDirectives: true,
  
  // Exclude any internal types (optional)
  excludeTypes: [
    // 'InternalType',
  ],
  
  // Watch mode for development
  watch: false,
}; 