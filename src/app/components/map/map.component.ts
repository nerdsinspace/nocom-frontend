import { Component, OnDestroy, OnInit } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Track } from '../../models/track';
import { Marker } from '../../models/marker';
import { MarkerType } from '../../models/marker-type.enum';
import { allDimensions, Dimension } from '../../models/dimension.enum';
import { AuthenticationService } from '../../services/authentication/authentication.service';
import { Plotly } from 'angular-plotly.js/src/app/shared/plotly.interface';
import { Hit } from '../../models/hit';
import { TrackHistory } from '../../models/track-history';
import { NotificationService } from '../../services/notification/notification.service';
import { Cluster } from '../../models/cluster';
import { JsUtils } from '../../models/js-utils';
import { Player } from '../../models/player';
import { ApiControllerService } from '../../services/api/api-controller.service';
import { RxStompService } from '@stomp/ng2-stompjs';
import { SchedulerService } from '../../services/scheduler/scheduler.service';
import { SubscriptionTracker } from '../../models/subscription-tracker';
import * as moment from 'moment';
import PlotlyHTMLElement = Plotly.PlotlyHTMLElement;
import PlotlyInstance = Plotly.PlotlyInstance;
import { Association } from 'src/app/models/association';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {
  readonly notificationId = 'notification-panel';
  public data = [] as Marker[];
  public layout = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    margin: {
      l: 0,
      r: 0,
      t: 0,
      b: 0
    },
    uirevision: 0,
    datarevision: 0,
    showlegend: false,
    hovermode: 'closest',
    dragmode: 'pan',
    xaxis: {
      autorange: false,
      range: [-1000000, 1000000],
      fixedrange: false,
      tickmode: 'linear',
      dtick: 100_000,
      nticks: 100
    },
    yaxis: {
      autorange: false,
      range: [-1000000, 1000000],
      fixedrange: false,
      scaleanchor: 'x',
      scaleratio: 1.0,
      tickmode: 'linear',
      dtick: 100_000,
      nticks: 100
    },
    shapes: [
      axisLine(),
      axisLine(),
      borderLine(30_000_000, 30_000_000, 30_000_000, -30_000_000),
      borderLine(-30_000_000, -30_000_000, 30_000_000, -30_000_000),
      borderLine(-30_000_000, -30_000_000, -30_000_000, 30_000_000),
      borderLine(-30_000_000, 30_000_000, 30_000_000, 30_000_000)
    ]
  };
  public config = {
    scrollZoom: true
  };
  public revision = 0;
  public trackingCount = {
    [Dimension.NETHER]: 0,
    [Dimension.OVERWORLD]: 0,
    [Dimension.END]: 0,
    sum: () => Object.values(this.trackingCount)
      .filter(v => typeof v === 'number')
      .map(v => v as number)
      .reduce((a, b) => a + b, 0)
  };
  public currentTrackTime = Date.now();
  public selectedCoordinate = '0 0';
  public selectedOffsetCoordinate = '0 0';
  public selectedNetherCoord = false;
  public playerAssociations = [] as Player[];
  public associations = [] as Association[];
  public selectedAssociationIndex: number = null;
  public maxRadius = 0;

  private notify: NotificationService;
  private trackLock: boolean;
  private subs = new SubscriptionTracker();

  private traceColors = {
    [Dimension.NETHER]: [
      'rgb(255, 111, 0)',
      'rgb(245, 197, 54)'
    ],
    [Dimension.OVERWORLD]: [
      'rgb(0,100,0)',
      'rgb(124,252,0)'
    ],
    [Dimension.END]: [
      'rgb(25,25,112)',
      'rgb(2,253,217)'
    ]
  };

  private drawOrder: MarkerType[] = [
    MarkerType.DIMENSION,
    MarkerType.TRACE,
    MarkerType.DBSCAN,
    MarkerType.DBSCAN_TRACE
  ];

  constructor(private plotly: PlotlyService,
              private auth: AuthenticationService,
              private api: ApiControllerService,
              private stomp: RxStompService,
              private scheduler: SchedulerService,
              ns: NotificationService) {
    this.notify = ns.wrap(this.notificationId);

    this.addMarker(new Marker(MarkerType.DIMENSION, {dimension: Dimension.NETHER, color: `rgb(255, 0, 0)`}));
    this.addMarker(new Marker(MarkerType.DIMENSION, {dimension: Dimension.OVERWORLD, color: `rgb(0, 255, 0)`}));
    this.addMarker(new Marker(MarkerType.DIMENSION, {dimension: Dimension.END, color: `rgb(0, 0, 255)`}));
  }

  ngOnInit(): void {
    this.subs.track(this.api.trackerListener().subscribe({
      next: tracks => this.onTrackUpdate(tracks),
      error: err => console.error('failed to update tracks', err)
    }));

    this.scheduler.repeating(() => this.onTick(), 2_000);
    this.scheduler.repeating(() => this.onDBSCAN(), 60_000);

    // reset
    this.trackLock = false;
  }

  ngOnDestroy(): void {
    this.subs.untrackAll();
    // clear all scheduled services
    this.scheduler.clearAll();
  }

  onPlotInit() {
    this.onResize();
    this.onTick();
    this.reboundCurrent();
    this.onDBSCAN();
  }

  onTick() {
    if (!this.stomp.connected()) {
      return this.scheduler.once(() => this.onTick(), 100);
    }

    this.api.requestTrackerUpdate('2b2t.org', this.currentTrackTime = Date.now());
  }

  onDBSCAN() {
    if (!this.stomp.connected()) {
      return this.scheduler.once(() => this.onDBSCAN(), 100);
    }

    this.api.getRootClusters('2b2t.org', Dimension.OVERWORLD).subscribe({
      next: clusters => this.onUpdateDBSCAN(clusters),
      error: err => console.log(err)
    });
  }

  onTrackUpdate(tracks: Track[]) {
    // clear all markers
    this.getDimensionMarkers().forEach(marker => marker.untrackPoints());
    allDimensions.forEach(d => this.trackingCount[d] = 0);

    tracks
      .filter(track => !this.isHitOutsideMaxRadius(track))
      .forEach(track => {
        this.trackingCount[track.dimension]++;

        const marker = this.getMarkerByDimension(track.dimension);
        marker.put(track);
        marker.uirevision++;

        const traceMarker = this.getMarkersByType(MarkerType.TRACE)
          .find(m => m.trackId === track.trackId);
        if (traceMarker != null) {
          traceMarker.put(track, true);
        }
      });

    this.getDimensionMarkers().forEach(marker => marker.deleteUntracked());

    this.updateGraph();
  }

  async onTrackHistoryUpdate(history: TrackHistory[]) {
    // clear previous markers
    this.removeMarkers(MarkerType.TRACE);

    let lastHit: Hit = null;

    const minXY = {x: null, y: null};
    const maxXY = {x: null, y: null};

    const max = (v: number, c: number) => c == null ? v : Math.max(v, c);
    const min = (v: number, c: number) => c == null ? v : Math.min(v, c);

    history
      .filter(track => track.hits.length > 0)
      .forEach((track, index) => {
        const colors = this.traceColors[track.dimension];
        const marker = new Marker(MarkerType.TRACE, {
          trackId: track.trackId,
          dimension: track.dimension,
          color: colors[index % colors.length]
        });

        track.hits.forEach(hit => {
          const i = marker.put(hit);
          marker.text[i] = new Date(hit.createdAt).toLocaleString();
          const x = marker.x[i];
          const y = marker.y[i];
          minXY.x = min(x, minXY.x);
          minXY.y = min(y, minXY.y);
          maxXY.x = max(x, maxXY.x);
          maxXY.y = max(y, maxXY.y);
        });

        if (lastHit != null) {
          marker.put(lastHit, true);
        }

        lastHit = track.hits[track.hits.length - 1];
        lastHit.dimension = track.dimension;
        lastHit.trackId = track.trackId;

        // add this marker to the front of the list
        this.addMarker(marker);
      });

    const scale = 512;
    this.layout.xaxis.range = [minXY.x - scale, maxXY.x + scale];
    this.layout.yaxis.range = [minXY.y - scale, maxXY.y + scale];

    return await this.redrawGraph();
  }

  async onUpdateDBSCAN(clusters: Cluster[]) {
    this.removeMarkers(MarkerType.DBSCAN);

    const marker = new Marker(MarkerType.DBSCAN, {color: 'rgb(255,0,255)'});
    const markerTimings = new Marker(MarkerType.DBSCAN, {color: 'rgb(100,100,255)'});

    clusters
      .filter(cluster => !this.isHitOutsideMaxRadius(cluster))
      .forEach(cluster => {
        if (cluster.updatedAt != null) {
          const i = markerTimings.put(cluster);
          markerTimings.text[i] = cluster.updatedAt.toLocaleString()
            + ' ('
            + moment(cluster.updatedAt).fromNow(false)
            + ')';
        } else {
          marker.put(cluster);
        }
      });

    this.addMarker(marker);
    this.addMarker(markerTimings);

    return await this.redrawGraph();
  }

  async onDeepDBSCAN(root: Cluster) {
    const minXY = {x: null, y: null};
    const maxXY = {x: null, y: null};

    const max = (v: number, c: number) => c == null ? v : Math.max(v, c);
    const min = (v: number, c: number) => c == null ? v : Math.min(v, c);

    // clear previous markers
    this.removeMarkers(MarkerType.DBSCAN_TRACE);

    const marker = new Marker(MarkerType.DBSCAN_TRACE, {color: 'rgb(255,100,200)', dimension: root.dimension});

    root.leafs.forEach(leaf => {
      minXY.x = min(leaf.x, minXY.x);
      minXY.y = min(leaf.z, minXY.y);
      maxXY.x = max(leaf.x, maxXY.x);
      maxXY.y = max(leaf.z, maxXY.y);
  
      marker.put(leaf);
    });

    this.addMarker(marker);

    this.api.getClusterAssociations(root.id).subscribe({
      next: players => this.onClusterAssociations(players),
      error: err => console.error('failed to get cluster associations', err)
    });

    const scale = 1024;
    this.layout.xaxis.range = [minXY.x - scale, maxXY.x + scale];
    this.layout.yaxis.range = [minXY.y - scale, maxXY.y + scale];

    return await this.redrawGraph();
  }

  async onClusterAssociations(players: Player[]) {
    const sessions = await this.api.getPlayersLatestSession(players.map(pl => pl.uuid), '2b2t.org').toPromise();

    sessions.forEach(session => {
      const pl = players.find(p => p.uuid === session.uuid);
      pl.online = session.leave == null;
      pl.join = session.join;
      pl.leave = session.leave;
    });

    this.playerAssociations = players;
  }

  onPlayerSearch(form: NgForm) {
    this.associations.length = 0;
    this.selectedAssociationIndex = null;

    this.api.getPlayerAssociations(form.value.search).subscribe({
      next: associations => {
        this.associations = associations;
      },
      error: err => console.error('failed to get player associations', err)
    });
  }

  onPlotlyClicked(data: any) {
    if (this.trackLock) {
      this.notify.publishWarning('Currently handling another request');
      return;
    }

    const point = data.points[0];
    const index = point.pointIndex;
    const marker: Marker = point.data;

    const acceptedTypes = [MarkerType.DIMENSION, MarkerType.DBSCAN];

    if (!acceptedTypes.includes(marker.markerType)) {
      this.notify.publishError(`Can only get track history for ${acceptedTypes.join(', ')} markers`);
      return;
    }

    const hit: Hit = marker.getHitByIndex(index);

    if (hit == null) {
      this.notify.publishError(`Index ${index} points to an invalid hit`);
      return;
    }

    this.playerAssociations.length = 0;
    this.associations.length = 0;
    this.selectedAssociationIndex = null;

    this.selectedNetherCoord = JsUtils.coalesce(hit.dimension, marker.dimension, Dimension.OVERWORLD) === Dimension.NETHER;
    this.selectedCoordinate = hit.x + ' ' + hit.z;

    switch (marker.markerType) {
      case MarkerType.DIMENSION: {
        const message = this.notify.publishInform(`Looking up track history for track #${hit.trackId}`, true);

        this.trackLock = true;
        this.api.getTrackHistory(hit.trackId, 10_000).subscribe({
          next: async history => await this.onTrackHistoryUpdate(history),
          error: err => console.error('failed to update track history', err),
          complete: () => {
            this.trackLock = false;
            message.remove(2500);
          }
        });
        break;
      }
      case MarkerType.DBSCAN: {
        const cluster: Cluster = hit as Cluster;
        this.plotlyClickedCluster(cluster.id);
        break;
      }
      default:
        console.log('unsupported');
    }
  }

  plotlyClickedCluster(clusterId: number) {
    const message = this.notify.publishInform(`Looking up child nodes for node #${clusterId}`, true);

    this.trackLock = true;

    this.api.getClusterChildren(clusterId).subscribe({
      next: _cluster => this.onDeepDBSCAN(_cluster),
      error: err => console.error(err),
      complete: () => {
        this.trackLock = false;
        message.remove(2500);
      }
    });
  }

  onClicked(event) {
  }

  onHover(event) {
  }

  onRelayout(event) {
    this.onRelayouting(event);
  }

  onRelayouting(event) {
    this.reboundDiagonals(
      [event['xaxis.range[0]'] as number, event['xaxis.range[1]'] as number],
      [event['yaxis.range[0]'] as number, event['yaxis.range[1]'] as number]
    );
  }

  onResize() {
    const overview = this.getGraphDiv();
    this.layout.width = overview.offsetWidth;
    this.layout.height = (window.innerHeight - overview.offsetTop);
  }

  onScroll(event) {
  }

  onMouseMove(event) {
  }

  onScaleCoord(o, scale) {
    if (this.selectedCoordinate != null) {
      const ss = this.selectedCoordinate.split(' ');
      const x = parseInt(ss[0], 10);
      const z = parseInt(ss[1], 10);
      this.selectedCoordinate = (x * scale) + ' ' + (z * scale);
      this.selectedNetherCoord = scale < 1;
    }
  }

  getCoordsWithOffset(): string {
    if (this.selectedCoordinate != null) {
      const ss = this.selectedCoordinate.split(' ');
      const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const x = parseInt(ss[0], 10) + rnd(-128, 128);
      const z = parseInt(ss[1], 10) + rnd(-128, 128);
      return x + ' ' + z;
    }
  }

  onSelected(event) {
    // console.log(event);
  }

  private updateRadiusEvent;

  onMaxRadiusChange(event) {
    if (this.updateRadiusEvent != null) {
      clearTimeout(this.updateRadiusEvent);
    }

    this.updateRadiusEvent = setTimeout(() => {
      this.maxRadius = event;
      this.onDBSCAN();
      this.updateRadiusEvent = null;
    }, 500);
  }

  private isOutsideMaxRadius(x: number, z: number, dimension?: Dimension): boolean {
    if (this.maxRadius <= 0) {
      return false;
    }

    x = dimension === Dimension.NETHER ? (x * 8) : x;
    z = dimension === Dimension.NETHER ? (z * 8) : z;
    return Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2)) > this.maxRadius;
  }

  private isHitOutsideMaxRadius(hit: Hit): boolean {
    return this.isOutsideMaxRadius(hit.x, hit.z, hit.dimension);
  }

  private reboundDiagonals(xs: number[], ys: number[]) {
    const max = largestAbs(xs.concat(ys));
    let axis = this.layout.shapes[0];
    axis.x0 = axis.y0 = -max;
    axis.x1 = axis.y1 = max;

    axis = this.layout.shapes[1];
    axis.x0 = axis.y1 = -max;
    axis.x1 = axis.y0 = max;

    const maxEdge = Math.max(xs[1] - xs[0], ys[1] - ys[0]);

    if (maxEdge > 5_000_000) {
      this.layout.xaxis.dtick = 1_000_000;
      this.layout.yaxis.dtick = 1_000_000;
    } else {
      this.layout.xaxis.dtick = 100_000;
      this.layout.yaxis.dtick = 100_000;
    }
  }

  private reboundCurrent() {
    const full = this.getFullLayout();
    this.reboundDiagonals(full.xaxis.range, full.yaxis.range);
    this.revision++;
    this.layout.uirevision++;
  }

  private updateGraph() {
    this.revision++;
    this.layout.datarevision++;
  }

  private redrawGraph(): Promise<PlotlyHTMLElement> {
    this.revision++;
    this.layout.datarevision++;
    return this.getPlotly().redraw(this.getGraphDiv());
  }

  private addMarker(marker: Marker) {
    this.data.push(marker);
    this.data = this.data.sort((a, b) => {
      const orderA = this.drawOrder.findIndex(v => v === a.markerType);
      const orderB = this.drawOrder.findIndex(v => v === b.markerType);
      return (orderB > -1 ? orderB : 1000) - (orderA > -1 ? orderA : 1000);
    });
  }

  private getGraphDiv(): PlotlyHTMLElement {
    return this.plotly.getInstanceByDivId('overview');
  }

  private getFullLayout(): FullLayout {
    return (this.getGraphDiv() as any)._fullLayout;
  }

  private getPlotly(): PlotlyInstanceExt {
    return this.plotly.getPlotly();
  }

  private getMarkerById(id: string) {
    return this.data.find(value => value._id === id);
  }

  private getMarkersByType(type: MarkerType): Marker[] {
    return this.data.filter(value => value.markerType === type);
  }

  private getDimensionMarkers(): Marker[] {
    return this.getMarkersByType(MarkerType.DIMENSION);
  }

  private getMarkerByDimension(dimension: Dimension | string): Marker {
    return this.getDimensionMarkers().find(value => value.dimension === dimension);
  }

  private removeMarkers(type: MarkerType) {
    this.data = this.data.filter(marker => marker.markerType !== type);
  }

  getAssociationColorClass(strength: number) {
    if (strength >= 3) {
      return 'badge-success';
    } else if (strength >= 2) {
      return 'badge-primary';
    } else if (strength >= 1) {
      return 'badge-warning';
    } else {
      return 'badge-danger';
    }
  }

  formatPlayerSession(player: Player): string {
    const time = player.leave == null ? player.join : player.leave;
    if (time == null) {
      return 'No join or leave date';
    }
    return (player.online ? 'Seen on ' : 'Last seen on ') + time.toLocaleString()
      + ' ('
      + moment(time).toNow(true) + ' ago'
      + ')';
  }

  setPlayerHoverText(player: any): void {
    player._hoverText = this.formatPlayerSession(player);
  }

  getPlayerHoverText(player: any): string {
    return player._hoverText;
  }
}

interface PlotlyInstanceExt extends PlotlyInstance {
  redraw(div: PlotlyHTMLElement): Promise<PlotlyHTMLElement>;

  relayout(div: PlotlyHTMLElement, layout: any): Promise<PlotlyHTMLElement>;
}

interface FullLayout {
  xaxis: { range: number[] };
  yaxis: { range: number[] };
}

function axisLine() {
  return {
    type: 'line',
    layer: 'below',
    xref: 'x',
    yref: 'y',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    opacity: 0.2,
    line: {
      width: 0.5
    }
  };
}

function borderLine(x1: number, y1: number, x2: number, y2: number) {
  return {
    type: 'line',
    layer: 'above',
    xref: 'x',
    yref: 'y',
    x0: x1,
    y0: y1,
    x1: x2,
    y1: y2,
    opacity: 1,
    line: {
      color: 'rgb(255,0,0)',
      width: 1
    }
  }
}

function largestAbs(values: number[]): number {
  return Math.max.apply(Math, values.map(n => Math.abs(n)));
}
