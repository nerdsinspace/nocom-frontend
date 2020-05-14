import { MarkerType } from './marker-type.enum';
import { Hit } from './hit';
import { Dimension } from './dimension.enum';
import { Point } from './point';
import { v4 as uuid } from 'uuid';

export class Marker {
  readonly _id: string = uuid();
  readonly dimension?: Dimension;
  readonly trackId?: number;
  private _points = [] as Hit[];

  x = [] as number[];
  y = [] as number[];
  text = [] as string[];
  mode: string;
  hoverinfo: string;
  type = 'scattergl';
  opacity: number;
  marker = {
    symbol: 'circle',
    color: 'rgb(0, 255, 0)',
    size: 7,
    opacity: 1,
    line: {
      color: `rgb(0,0,0)`,
      width: 0.5,
    }
  };
  uirevision = 0;

  constructor(readonly markerType: MarkerType, options: {dimension?: Dimension, trackId?: number, color?: string}) {
    switch (this.markerType) {
      case MarkerType.DIMENSION:
        this.mode = 'markers';
        this.hoverinfo = 'text+x+y';
        this.marker.symbol = 'diamond';
        break;
      case MarkerType.TRACE:
        this.mode = 'lines';
        // this.hoverinfo = 'skip';
        this.marker.line = undefined;
        break;
      case MarkerType.DBSCAN:
        this.mode = 'markers';
        this.hoverinfo = 'text+x+y';
        this.marker.symbol = 'circle';
        this.marker.size = 5;
        this.opacity = 0.5;
        this.marker.line = undefined;
        break;
      case MarkerType.DBSCAN_TRACE:
        this.mode = 'markers';
        this.hoverinfo = 'skip';
        this.marker.symbol = 'square';
        this.marker.line = undefined;
        this.marker.size = 4;
        break;
    }

    if (options != null) {
      this.dimension = options.dimension;
      this.trackId = options.trackId;

      if (options.color != null) {
        this.changeColor(options.color);
      }
    }
  }

  public changeColor(color: string) {
    this.marker.color = color;
  }

  public get(trackId: number): Hit {
    const index = this.getIndex(trackId);
    return index === -1 ? null : this._points[index];
  }

  public getIndex(trackId: number): number {
    return (trackId == null || this.markerType !== MarkerType.DIMENSION) ? -1
      : this._points.findIndex(value => value.trackId === trackId);
  }

  public getHitByIndex(index: number): Hit {
    return this._points[index];
  }

  public put(hit: Hit, front?: boolean): number {
    let mode = 2;
    let index = this.getIndex(hit.trackId);
    if (index === -1) {
      // no existing hit with this track id exists
      if (front == null || !front) {
        // add to end of list
        this._points.push(hit);
        index = this._points.length - 1;
        mode = 0;
      } else {
        // add to front of list
        this._points.unshift(hit);
        index = 0;
        mode = 1;
      }
    } else {
      // update existing hit at the given index
      this._points[index] = hit;
    }
    this.update(index, mode);
    return index;
  }

  public update(index: number, mode?: number) {
    const hit = this._points[index];
    const p = this.overworldCoord(hit);
    switch (mode) {
      case 0:
        this.x.push(p.x);
        this.y.push(p.z);
        this.text.push(null);
        break;
      case 1:
        this.x.unshift(p.x);
        this.y.unshift(p.z);
        this.text.unshift(null);
        break;
      case 2:
      default:
        this.x[index] = p.x;
        this.y[index] = p.z;
        this.text[index] = null;
    }
    (this._points[index] as any)._updated = true;
  }

  public untrackPoints() {
    this._points.map(hit => hit as any).forEach(hit => hit._updated = false);
  }

  public deleteUntracked() {
    let i = 0;
    while (i < this._points.length) {
      const hit: any = this._points[i];
      if (!hit._updated) {
        this.remove(i);
      } else {
        ++i;
      }
    }
  }

  public remove(index: number) {
    this._points.splice(index, 1);
    this.x.splice(index, 1);
    this.y.splice(index, 1);
  }

  public removeHit(hit: Hit) {
    this.remove(this.getIndex(hit.trackId));
  }

  public clear() {
    this._points.length = 0;
    this.x.length = 0;
    this.y.length = 0;
  }

  private overworldCoord(hit: Hit): Point {
    const dim = hit.dimension != null ? hit.dimension : (this.dimension != null ? this.dimension : Dimension.OVERWORLD);
    const inNether = dim === Dimension.NETHER;
    return {
      x: inNether ? hit.x * 8 : hit.x,
      z: inNether ? hit.z * 8 : hit.z
    };
  }
}

export interface MarkerOptions {
  dimension?: Dimension;
  trackId?: number;
  color?: string;
}
