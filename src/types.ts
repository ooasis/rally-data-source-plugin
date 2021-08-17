import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface RallyQuery extends DataQuery {
  project?: string;
  storyId?: number;
  defectId?: number;
}

/**
 * These are options configured for each DataSource instance
 */
export interface RallyDataSourceOptions extends DataSourceJsonData {
  apiEndpoint: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface RallySecureJsonData {
  apiKey: string;
}
