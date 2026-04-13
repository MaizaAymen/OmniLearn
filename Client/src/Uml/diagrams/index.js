import * as classDiagram from './classDiagram';
import * as stateMachine from './stateMachine';
import * as activityDiagram from './activityDiagram';
import * as useCaseDiagram from './useCaseDiagram';
import * as sequenceDiagram from './sequenceDiagram';

export const DIAGRAM_TABS = [
  { id: 'class', label: 'Class', icon: '◻' },
  { id: 'stateMachine', label: 'State Machine', icon: '◎' },
  { id: 'activity', label: 'Activity', icon: '▶' },
  { id: 'useCase', label: 'Use Case', icon: '◯' },
  { id: 'sequence', label: 'Sequence', icon: '⇄' },
];

const CONFIGS = {
  class: classDiagram,
  stateMachine: stateMachine,
  activity: activityDiagram,
  useCase: useCaseDiagram,
  sequence: sequenceDiagram,
};

export default CONFIGS;
