import { Dimension } from './dimension.enum';
import { Point } from './point';

export interface Cluster extends Point {
  id: number;
  count: number;
  x: number;
  z: number;
  dimension: Dimension;
  server?: string;
  core: boolean;
  clusterParent: number;
  disjointRank: number;
  disjointSize: number;
  leafs?: ClusterLeaf[];
  updatedAt: Date;
}

export interface ClusterLeaf extends Point {
  id: number;
  x: number;
  z: number;
}
