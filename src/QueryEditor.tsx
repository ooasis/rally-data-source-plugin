import { QueryEditorProps } from '@grafana/data';
import { Button, LegacyForms } from '@grafana/ui';
import React, { ChangeEvent, PureComponent } from 'react';
import { DataSource } from './datasource';
import { RallyDataSourceOptions, RallyQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, RallyQuery, RallyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onProjectChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, project: event.target.value });
  };

  onStoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    const newVal = event.target.value;
    onChange({ ...query, storyId: newVal ? parseInt(newVal, 10) : undefined });
  };

  onDefectChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    const newVal = event.target.value;
    onChange({ ...query, defectId: newVal ? parseInt(newVal, 10) : undefined });
  };

  onExecute = () => {
    const { onRunQuery } = this.props;
    onRunQuery();
  };

  render() {
    const { project, storyId, defectId } = this.props.query;

    return (
      <div className="gf-form">
        <FormField width={8} value={project} onChange={this.onProjectChange} label="Project" />
        <FormField width={8} value={storyId} onChange={this.onStoryChange} label="Story Id" type="number" step="1" />
        <FormField width={8} value={defectId} onChange={this.onDefectChange} label="Defect Id" type="number" step="1" />
        <Button onClick={this.onExecute}>Execute</Button>
      </div>
    );
  }
}
