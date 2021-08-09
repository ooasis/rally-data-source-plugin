import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { Button, LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onProjectChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, project: event.target.value });
  };

  onStoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    const newVal = event.target.value;
    onChange({ ...query, story: newVal ? parseInt(newVal, 10) : undefined });
  };

  onDefectChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    const newVal = event.target.value;
    onChange({ ...query, defect: newVal ? parseInt(newVal, 10) : undefined });
  };

  onExecute = () => {
    const { onRunQuery } = this.props;
    onRunQuery();
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { project, story, defect } = query;

    return (
      <div className="gf-form">
        <FormField width={8} value={project} onChange={this.onProjectChange} label="Project" />
        <FormField width={8} value={story} onChange={this.onStoryChange} label="Story Id" type="number" step="1" />
        <FormField width={8} value={defect} onChange={this.onDefectChange} label="Defect Id" type="number" step="1" />
        <Button onClick={this.onExecute}>Execute</Button>
      </div>
    );
  }
}
