// based on https://developer.here.com/documentation/maps/topics/routing.html

import React, { Component } from 'react';
import polyline from '@mapbox/polyline';
import { round } from './lib/time';
import './App.css';

class App extends Component {
  constructor() {
    super();

    this.state = {
      map: false,
      route: false,
      obs: false,
      poly: false
    };

    this.loadRouteSuccess = this.loadRouteSuccess.bind(this);
    this.loadRouteError = this.loadRouteError.bind(this);
    this.fetchObsSuccess = this.fetchObsSuccess.bind(this);
    this.fetchObsError = this.fetchObsError.bind(this);
  }

  componentDidMount() {
    this.platform = new window.H.service.Platform({
      app_id: 'CUmx9HPYqjMefC4vsWPl',
      app_code: 'UAOOJWuOwy1dhGJ8fywKDg',
      useHTTPS: true
    });

    this.loadMap();
    this.loadRoute();
  }

  loadMap() {
    const defaultLayers = this.platform.createDefaultLayers();

    const map = new window.H.Map(
      document.getElementById('map'),
      defaultLayers.normal.map
    );

    map.setCenter({ lat: 28.15, lng: -80.80 }); // Melbourne, FL
    map.setZoom(10);

    this.map = map;
    this.mapBehavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
    this.mapUi = window.H.ui.UI.createDefault(map, defaultLayers);

    return this.setState({ map: true });
  }

  // Load the route between two static locations using the HERE routing service
  // TODO: allow the user to click on the map to set a location ?
  //
  loadRoute() {
    const router = this.platform.getRoutingService();

    router.calculateRoute({
      mode: 'fastest;car',
      waypoint0: 'geo!28.0345,-80.5887',
      waypoint1: 'geo!28.3861,-80.7420',
      representation: 'display'
    }, this.loadRouteSuccess, this.loadRouteError);
  }

  // Display the route on the map
  //
  loadRouteSuccess(result) {
    if(result.response.route) {
      this.setState({ route: true });

      const route = result.response.route[0];
      const routeShape = route.shape;
      const linestring = new window.H.geo.LineString();
      const points = [];

      routeShape.forEach(function(point) {
        const parts = point.split(',');
        linestring.pushLatLngAlt(parts[0], parts[1]);
        points.push([Number(parts[0]), Number(parts[1])]);
      });

      const startPoint = route.waypoint[0].mappedPosition;
      const endPoint = route.waypoint[1].mappedPosition;

      const routeLine = new window.H.map.Polyline(linestring, {
        style: { lineWidth: 10 }
      });

      const startMarker = new window.H.map.Marker({
        lat: startPoint.latitude,
        lng: startPoint.longitude
      });

      const endMarker = new window.H.map.Marker({
        lat: endPoint.latitude,
        lng: endPoint.longitude
      });

      this.map.addObjects([routeLine, startMarker, endMarker]);

      const pline = polyline.encode(points)

      this.fetchObs(pline);
    }
  }

  loadRouteError(error) {
    this.setState({ route: 'error' });
  }

  // Fetch observation for the route from the Helios Observations API
  //
  fetchObs(pline) {
    /*fetch(`https://api.helios.earth/v1/observations/_search`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        polyline: pline,
        time_max: round('now', 5),
        time_min: round('now', 5, 5),
        limit: 50
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })*/

    // use static data for demo
    fetch('data.json')
      .then(response => response.json())
      .then(this.fetchObsSuccess)
      .catch(this.fetchObsError);
  }

  fetchObsDemo() {

  }

  // Display the observation results (GeoJSON Feature Collection)
  //
  fetchObsSuccess(results) {
    this.setState({ obs: true });

    const ui = this.mapUi;

    const explore = 'https://helios.earth/explore/assets/images/map-v2';
    const api = 'https://api.helios.earth/v1';

    const dry = new window.H.map.Icon(`${explore}/road-dry.png`, {
      size: { w: 30, h: 30 },
      anchor: { x: 15, y: 15 }
    });

    const moist = new window.H.map.Icon(`${explore}/road-moist.png`, {
      size: { w: 30, h: 30 },
      anchor: { x: 15, y: 15 }
    });

    const wet = new window.H.map.Icon(`${explore}/road-wet.png`, {
      size: { w: 30, h: 30 },
      anchor: { x: 15, y: 15 }
    });

    const group = new window.H.map.Group();
    this.map.addObject(group);

    group.addEventListener('tap', function (evt) {
      const bubble = new window.H.ui.InfoBubble(evt.target.getPosition(), {
        content: evt.target.getData()
      });
      ui.addBubble(bubble);
    }, false);

    results.features.forEach((feature) => {
      if (!feature.properties.sensors.road_weather) return false;

      let icon;
      switch(feature.properties.sensors.road_weather.data) {
        case 1:
          icon = moist;
          break;
        case 3:
          icon = wet;
          break;
        default:
          icon = dry;
      }

      const marker = new window.H.map.Marker({
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
      }, {
        icon
      });

      marker.setData(`
        <div>
          <img src="${api}/observations/${feature.id}/preview" />
          <p>${feature.properties.city}, ${feature.properties.state}</p>
          <p>${feature.properties.time}</p>
        </div>
      `);

      group.addObject(marker);
    });
  }

  fetchObsError(error) {
    this.setState({ obs: 'error' });
  }

  render() {
    return (
      <div id="app">
        <div id="map"></div>
        <aside>
          <div id="logos">
            <img alt="here-logo" src="https://is5-ssl.mzstatic.com/image/thumb/Purple128/v4/16/cb/91/16cb9194-48db-d12a-fbb5-7469cfc3e4f7/AppIcon-1x_U007emarketing-0-0-GLES2_U002c0-512MB-sRGB-0-0-0-85-220-0-0-0-6.png/246x0w.jpg" />
            <span>+</span>
            <img alt="helios-logo" src="https://helios.earth/explore/assets/images/apple-touch-icon.png" />
          </div>

          <hr />

          <ul>
            <li data-complete={this.state.map}>
              Initialize HERE map
            </li>
            <li data-complete={this.state.route}>
              Calculate route from Palm Bay, FL to Cocoa, FL
              using the HERE Routing API
            </li>
            <li id="obs" data-complete={this.state.obs}>
              Fetch recent road weather data for the route using the Helios
              Observations API
              <p>
                <small>
                  Make sure you are logged in to <a href="https://helios.earth/explore/">Helios Explore</a>
                </small>
              </p>
            </li>
          </ul>

          <hr />

          <p id="github">
            <small>
              <a href="https://github.com/harris-helios/helios-demo-here">View on GitHub</a>
            </small>
          </p>
        </aside>
      </div>
    );
  }
}

export default App;
