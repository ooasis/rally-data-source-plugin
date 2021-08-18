// @ts-ignore
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { RallyDataSourceOptions, RallyQuery } from './types';

const routePath = '/rally';

export class DataSource extends DataSourceApi<RallyQuery, RallyDataSourceOptions> {
  url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<RallyDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url;
  }

  async query(options: DataQueryRequest<RallyQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map(async (query) => {
      const frame = await this.doRequest(query);
      return frame;
    });
    const data = await Promise.all(promises);
    return { data };
  }

  async doRequest(query: RallyQuery) {
    if (!query.project) {
      return await this.fetchProjects(query);
    } else if (query.storyId) {
      return await this.fetchStory(query);
    } else if (query.defectId) {
      return await this.fetchDefect(query);
    } else {
      return await this.fetchInProgressArtifacts(query);
    }
  }

  async fetchStory(q: RallyQuery) {
    const params = {
      fetch: 'FormattedID,Name,ObjectId,LastUpdateDate',
    };
    const frame = new MutableDataFrame({
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });
    const extractor = (r: any) => [r.FormattedID, r.Name, q.storyId];
    this.fetchEntities(`/hierarchicalrequirement/${q.storyId}`, frame, extractor, params);
    return frame;
  }

  async fetchDefect(q: RallyQuery) {
    const params = {
      fetch: 'FormattedID,Name,ObjectId,LastUpdateDate',
    };
    const frame = new MutableDataFrame({
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });
    const extractor = (r: any) => [r.FormattedID, r.Name, q.defectId];
    this.fetchEntities(`/defect/${q.defectId}`, frame, extractor, params);
    return frame;
  }

  async fetchInProgressArtifacts(q: RallyQuery) {
    const query = `((Project.Name = "${q.project}") AND (c_KanbanState = "In Progress"))`;
    const params = {
      query,
      order: 'LastUpdateDate desc',
      pagesize: 2000,
      fetch: 'FormattedID,Name,ObjectId,LastUpdateDate',
    };
    const frame = new MutableDataFrame({
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
        { name: 'type', type: FieldType.string },
      ],
    });

    let storyExtractor = (r: any) => [r.FormattedID, r.Name, r.ObjectId, 'userstory'];
    this.fetchEntities(`/hierarchicalrequirement`, frame, storyExtractor, params);

    let defectExtractor = (r: any) => [r.FormattedID, r.Name, r.ObjectId, 'defect'];
    this.fetchEntities(`/defect`, frame, defectExtractor, params);

    return frame;
  }

  async fetchProjects(q: RallyQuery) {
    const params = {
      pagesize: 2000,
      order: 'Name',
      fetch: 'Name,ObjectID',
    };
    const frame = new MutableDataFrame({
      fields: [
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });
    const extractor = (r: any) => [r.Name, r.ObjectID];
    this.fetchEntities('/project', frame, extractor, params);
    return frame;
  }

  async fetchEntities(path: string, frame: MutableDataFrame, extractor: (r: any) => any[], params?: object) {
    const {
      ok,
      statusText,
      data: {
        QueryResult: { Results: entities },
      },
    } = await this.callRallyAPI(path, params);

    if (ok) {
      entities.forEach((r: any) => {
        frame.appendRow(extractor(r));
      });
    } else {
      console.error(`Failed to fetch projects. Error: ${statusText}`);
    }
  }

  async callRallyAPI(path: string, params: object = {}) {
    const response = await getBackendSrv().datasourceRequest({ url: this.url + routePath + path, params });
    console.debug(`Rally API response: %o`, response);
    return response;
  }

  async testDatasource() {
    const { ok, statusText } = await this.callRallyAPI('/subscription');
    return {
      status: ok ? 'success' : 'error',
      message: ok ? 'Success' : `Error: ${statusText}`,
    };
  }
}
