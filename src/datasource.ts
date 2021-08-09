// import defaults from 'lodash/defaults';

// @ts-ignore
import { getBackendSrv, logDebug, logInfo, logWarning, logError } from '@grafana/runtime';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';

const routePath = '/rally';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map(async query => {
      const frame = await this.doRequest(query);
      return frame;
    });
    const data = await Promise.all(promises);
    return { data };
  }

  async doRequest(query: MyQuery) {
    if (!query.project) {
      return await this.fetchProjects(query);
    } else if (query.story) {
      return await this.fetchStory(query.story, query);
    } else if (query.defect) {
      return await this.fetchDefect(query.defect, query);
    } else {
      return await this.fetchInProgressArtifacts(query.project, query);
    }
  }

  async fetchStory(id: number, q: MyQuery) {
    const {
      ok,
      statusText,
      data: { HierarchicalRequirement: story },
    } = await this.callRallyAPI(`/hierarchicalrequirement/${id}`);

    const frame = new MutableDataFrame({
      refId: q.refId,
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });

    if (ok && story) {
      frame.appendRow([story.FormattedID, story._refObjectName, id]);
    } else {
      logError(`Failed to fetch story ${id}. Error: ${statusText}`);
    }

    return frame;
  }

  async fetchDefect(id: number, q: MyQuery) {
    const {
      ok,
      statusText,
      data: { Defect: defect },
    } = await this.callRallyAPI(`/defect/${id}`);

    const frame = new MutableDataFrame({
      refId: q.refId,
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });

    if (ok && defect) {
      frame.appendRow([defect.FormattedID, defect._refObjectName, id]);
    } else {
      logError(`Failed to fetch defect ${id}. Error: ${statusText}`);
    }

    return frame;
  }

  async fetchInProgressArtifacts(project: string, q: MyQuery) {
    const query = `((Project.Name = "${project}") AND (c_KanbanState = "In Progress"))`;
    const params = {
      query,
      order: 'LastUpdateDate desc',
      fetch: true,
    };
    const {
      ok: ok1,
      statusText: statusText1,
      data: {
        QueryResult: { Results: stories },
      },
    } = await this.callRallyAPI('/hierarchicalrequirement', params);

    const frame = new MutableDataFrame({
      refId: q.refId,
      fields: [
        { name: 'key', type: FieldType.string },
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
        { name: 'type', type: FieldType.string },
      ],
    });

    if (ok1) {
      stories.forEach((r: any) => {
        frame.appendRow([r.FormattedID, r._refObjectName, parseInt(r._ref.split('/').pop(), 10), 'story']);
      });
    } else {
      logError(`Failed to fetch stories for project ${project}. Error: ${statusText1}`);
    }

    const {
      ok: ok2,
      statusText: statusText2,
      data: {
        QueryResult: { Results: defects },
      },
    } = await this.callRallyAPI('/defect', params);

    if (ok2) {
      defects.forEach((r: any) => {
        frame.appendRow([r.FormattedID, r._refObjectName, parseInt(r._ref.split('/').pop(), 10), 'defect']);
      });
    } else {
      logError(`Failed to fetch defects for project ${project}. Error: ${statusText2}`);
    }

    return frame;
  }

  async fetchProjects(q: MyQuery) {
    const {
      ok,
      statusText,
      data: {
        QueryResult: { Results: projects },
      },
    } = await this.callRallyAPI('/project');

    const frame = new MutableDataFrame({
      refId: q.refId,
      fields: [
        { name: 'name', type: FieldType.string },
        { name: 'id', type: FieldType.number },
      ],
    });

    if (ok) {
      projects.forEach((r: any) => {
        frame.appendRow([r._refObjectName, parseInt(r._ref.split('/').pop(), 10)]);
      });
    } else {
      logError(`Failed to fetch projects. Error: ${statusText}`);
    }
    return frame;
  }

  async callRallyAPI(path: string, params: any = {}) {
    const response = await getBackendSrv().datasourceRequest({
      method: 'GET',
      url: this.url + routePath + path,
      params,
    });
    logDebug(`Rally API response: ${response}`);
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
