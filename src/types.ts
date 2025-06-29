export interface DocGenConfig {
  endpoint: string;
  output: string;
  headers?: Record<string, string>;
  excludeTypes?: string[];
  watch?: boolean;
  maxDepth?: number;
  maxFields?: number;
  circularRefs?: 'skip' | 'silent' | 'allow';
  shallowMode?: boolean;
  includeFields?: string[];
  excludeFields?: string[];
  fieldDepthMap?: Record<string, number>;
  circularRefDepth?: number;
  circularRefTypes?: Record<string, number>;
} 