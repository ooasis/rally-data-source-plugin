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
    const frame = new MutableDataFrame({
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });
    const extractor = (r: any) => [r.FormattedID, r._refObjectName, q.storyId];
    this.fetchEntities(`/hierarchicalrequirement/${q.storyId}`, frame, extractor);
    return frame;
  }

  async fetchDefect(q: RallyQuery) {
    const frame = new MutableDataFrame({
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });
    const extractor = (r: any) => [r.FormattedID, r._refObjectName, q.defectId];
    this.fetchEntities(`/defect/${q.defectId}`, frame, extractor);
    return frame;
  }

  async fetchInProgressArtifacts(q: RallyQuery) {
    const query = `((Project.Name = "${q.project}") AND (c_KanbanState = "In Progress"))`;
    const params = {
      query,
      order: 'LastUpdateDate desc',
      fetch: true,
    };
    const frame = new MutableDataFrame({
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
        { name: 'type', type: FieldType.string },
      ],
    });

    let storyExtractor = (r: any) => [
      r.FormattedID,
      r._refObjectName,
      parseInt(r._ref.split('/').pop(), 10),
      'userstory',
    ];
    this.fetchEntities(`/hierarchicalrequirement`, frame, storyExtractor, params);

    let defectExtractor = (r: any) => [
      r.FormattedID,
      r._refObjectName,
      parseInt(r._ref.split('/').pop(), 10),
      'defect',
    ];
    this.fetchEntities(`/defect`, frame, defectExtractor, params);

    return frame;
  }

  async fetchProjects(q: RallyQuery) {
    const frame = new MutableDataFrame({
      fields: [
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });
    const extractor = (r: any) => [r._refObjectName, parseInt(r._ref.split('/').pop(), 10)];
    this.fetchEntities('/project', frame, extractor);
    return frame;
  }

  async fetchEntities(path: string, frame: MutableDataFrame, extractor: (r: any) => any[], params?: object) {
    const {
      ok,
      statusText,
      data: {
        QueryResult: { Results: entities },
      },
    } = await this.callRallyAPI(path);

    if (ok) {
      entities.forEach((r: any) => {
        frame.appendRow(extractor(r));
      });
    } else {
      console.error(`Failed to fetch projects. Error: ${statusText}`);
    }
  }

  async callRallyAPI(path: string, params: any = {}) {
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
