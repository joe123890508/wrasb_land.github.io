  var map = L.map('map', {center: [22.689,120.436], zoom: 15, zoomControl: true, renderer: L.canvas()});
  L.control.scale({position: 'bottomleft'}).addTo(map);
  var basemaps = [
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/{id}/default/GoogleMapsCompatible/{z}/{y}/{x}.png', {
      maxZoom: 20, id: 'EMAP', label: '測試一' }),
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/{id}/default/GoogleMapsCompatible/{z}/{y}/{x}.png', {
      maxZoom: 20, id: 'PHOTO2', label: '測試二' }),
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/{id}/default/GoogleMapsCompatible/{z}/{y}/{x}.png', {
      maxZoom: 20, id: 'LUIMAP', label: '測試三' })
  ];
  L.Control.Basemaps = L.Control.extend({_map:null,includes:L.Evented?L.Evented.prototype:L.Mixin.Event,options:{position:"bottomright",tileX:0,tileY:0,tileZ:0,layers:[]},basemap:null,onAdd:function(e){this._map=e;var t=L.DomUtil.create("div","basemaps leaflet-control closed");return L.DomEvent.disableClickPropagation(t),L.Browser.touch||L.DomEvent.disableScrollPropagation(t),this.options.basemaps.forEach(function(s,o){var a,i="basemap";if(0===o?(this.basemap=s,this._map.addLayer(s),i+=" active"):1===o&&(i+=" alt"),s.options.iconURL)a=s.options.iconURL;else{var l={x:this.options.tileX,y:this.options.tileY};if(a=L.Util.template(s._url,L.extend({s:s._getSubdomain(l),x:l.x,y:s.options.tms?s._globalTileRange.max.y-l.y:l.y,z:this.options.tileZ},s.options)),s instanceof L.TileLayer.WMS){s._map=e;var n=s.options.crs||e.options.crs,r=L.extend({},s.wmsParams),m=parseFloat(r.version);r[m>=1.3?"crs":"srs"]=n.code;var p=L.point(l);p.z=this.options.tileZ;var c=s._tileCoordsToBounds(p),d=n.project(c.getNorthWest()),h=n.project(c.getSouthEast()),v=(m>=1.3&&n===L.CRS.EPSG4326?[h.y,d.x,d.y,h.x]:[d.x,h.y,h.x,d.y]).join(",");a+=L.Util.getParamString(r,a,s.options.uppercase)+(s.options.uppercase?"&BBOX=":"&bbox=")+v}}var b=L.DomUtil.create("div",i,t),u=L.DomUtil.create("img",null,b);u.src=a,s.options&&s.options.label&&(u.title=s.options.label),L.DomEvent.on(b,"click",function(){if(this.options.basemaps.length>2&&L.Browser.mobile&&L.DomUtil.hasClass(t,"closed"))L.DomUtil.removeClass(t,"closed");else if(s!=this.basemap){e.removeLayer(this.basemap),e.addLayer(s),s.bringToBack(),e.fire("baselayerchange",s),this.basemap=s,L.DomUtil.removeClass(t.getElementsByClassName("basemap active")[0],"active"),L.DomUtil.addClass(b,"active");var a=(o+1)%this.options.basemaps.length;L.DomUtil.removeClass(t.getElementsByClassName("basemap alt")[0],"alt"),L.DomUtil.addClass(t.getElementsByClassName("basemap")[a],"alt"),L.DomUtil.addClass(t,"closed")}},this)},this),this.options.basemaps.length>2&&!L.Browser.mobile&&(L.DomEvent.on(t,"mouseenter",function(){L.DomUtil.removeClass(t,"closed")},this),L.DomEvent.on(t,"mouseleave",function(){L.DomUtil.addClass(t,"closed")},this)),this._container=t,this._container}}),L.control.basemaps=function(e){return new L.Control.Basemaps(e)};
  map.addControl(L.control.basemaps({ basemaps: basemaps, tileX: 854, tileY: 444, tileZ: 10 }));
  google_map_url = 'https://www.google.com/maps/search/?api=1&query=';
  async function loadAllData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('d-none');
    try {
      const res1 = await fetch("https://joe123890508.github.io/wrasb_land.github.io/114wrasb_fac.geojson");
      vardata = await res1.json();
      renderGeoJson(vardata);
    } catch (error) {
      console.error("資料載入失敗", error);
      alert("資料載入失敗，請稍後再試！");
    } finally { loadingOverlay.classList.add('d-none'); }
  }
  function getColorByCategory(category) {
    const colorMap = {
      "牡管中心": "green", "高管中心": "blue", "秘書室": "darkmagenta",
      "資產科": "goldenrod", "阿管中心": "limegreen", "工務科": "darkcyan",
      "曾管中心": "tomato", "甲管中心": "coral"
    };
    return colorMap[category] || "black";
  }
  function renderGeoJson(data) {
    const controlLayers = L.control.layers(null, null, { collapsed: true }).addTo(map);
    const layersByCategory = {};
    data.features.forEach(feature => {
      const category = feature.properties.保管單位;
      if (!layersByCategory[category]) {
        layersByCategory[category] = L.markerClusterGroup({showCoverageOnHover: false});
        const color = getColorByCategory(category);
        const nameWithIcon = `<span style="display:inline-block; width:9px; height:9px; background:${color}; margin-right:6px; border-radius:50%;"></span>${category}`;
        controlLayers.addOverlay(layersByCategory[category], nameWithIcon);
      }
      const coords = feature.geometry.coordinates;
      const lat = coords[1];
      const lng = coords[0];
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div style="width:12px; height:12px; background:${getColorByCategory(category)}; border-radius:50%; border:2px solid white;"></div>`
        })
      });
      /* 點擊 Marker 觸發 Modal 優化邏輯 */
      marker.on("click", () => {
        let tableContent = '<table class="custom-feature-table">';
        for (let key in feature.properties) {
          const val = feature.properties[key] !== null && feature.properties[key] !== undefined ? feature.properties[key] : '-';
          tableContent += `<tr><th>${key}</th><td>${val}</td></tr>`;
        }
        tableContent += '</table>';
        document.getElementById("feature-info").innerHTML = tableContent;
        document.getElementById("feature-title").innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-info-circle-fill text-primary" viewBox="0 0 16 16">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
          <span>財產詳情：${feature.properties['財產編號'] || ''}</span>
        `;
        $('#featureModal').modal('show');
        $('#google_map').off('click').on('click', () => { window.open(google_map_url + lat + ',' + lng); });
      });
      layersByCategory[category].addLayer(marker);
    });
    for (let category in layersByCategory) { map.addLayer(layersByCategory[category]); }
    var unit_list = document.getElementById("unit");
    let inner = "<option value>請選擇</option>";
    let inner_list = [];
    for (let i = 0; i < vardata['features'].length; i++) {
      let unit = vardata['features'][i].properties.保管單位;
      if (!inner_list.includes(unit)) {
        inner += `<option value="${unit}">${unit}</option>`;
        inner_list.push(unit);
      }
    }
    unit_list.innerHTML = inner;
  }
  loadAllData();
  L.control.fullscreen({ position: 'topleft', forceSeparateButton: true, forcePseudoFullscreen: true, fullscreenElement: false }).addTo(map);
  L.DomEvent.disableClickPropagation(document.getElementById('featureModal'));
  document.getElementById("confirm").addEventListener("click", () => {
    const tbody = document.getElementById("search_result_list");
    tbody.innerHTML = "";
    const number_value = document.getElementById("number").value.trim();
    const unit_value = document.getElementById("unit").value;
    const people_value = document.getElementById("people").value.trim();
    const card_value = document.getElementById("card").value;
    const qr_value = document.getElementById("qr").value;
    const results = vardata.features.filter(item => {
      const match_number = number_value === "" || ((item.properties.財產編號 || "").includes(number_value));
      const match_unit = unit_value === "請選擇" || unit_value === "" || ((item.properties.保管單位 || "").includes(unit_value));
      const match_people = people_value === "" || ((item.properties.保管人 || "").includes(people_value));
      const match_card = card_value === "請選擇" || ((item.properties.有無貼牌 || "").includes(card_value));
      const match_qr = qr_value === "請選擇" || ((item.properties.有無QRCode || "").includes(qr_value));
      return match_number && match_unit && match_people && match_card && match_qr;
    });
    results.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.properties.財產編號}</td>
        <td>${item.properties.保管單位}</td>
        <td>${item.properties.保管人}</td>
        <td><button class="btn btn-sm btn-primary search-button" lat="${item.geometry.coordinates[1]}" lng="${item.geometry.coordinates[0]}">定位</button></td>
      `;
      tbody.appendChild(tr);
    });
    document.querySelectorAll("button.search-button").forEach(btn => {
      btn.addEventListener("click", () => {
        map.flyTo([btn.getAttribute("lat"), btn.getAttribute("lng")], 18);
      });
    });
    if (results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">沒有符合的資料</td></tr>`;
    }
  });
  var featureModalEl = document.getElementById('featureModal');
  featureModalEl.addEventListener('show.bs.modal', function () {
    map.scrollWheelZoom.disable(); // 禁用滑鼠輪滾縮放
    map.doubleClickZoom.disable(); // 禁用雙擊縮放
    map.touchZoom.disable();       // 禁用手勢縮放
    map.boxZoom.disable();         // 禁用拉框縮放
    map.keyboard.disable();        // 禁用鍵盤操作
    map.dragging.disable();        // 禁用地圖拖曳
  });
  featureModalEl.addEventListener('hidden.bs.modal', function () {
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    map.dragging.enable();
  });