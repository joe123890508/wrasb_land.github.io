  // 全域變數初始化
  window.global_json = null;
  window.global_json2 = null;
  let county = "", town = "", village = "";
  var map = L.map('map', {center: [22.689,120.436], zoom: 15, zoomControl: true, renderer: L.canvas()});
  L.control.scale({position: 'bottomleft'}).addTo(map);
  var basemaps = [
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/{id}/default/GoogleMapsCompatible/{z}/{y}/{x}.png', { maxZoom: 20, id: 'EMAP', label: '臺灣通用電子地圖' }),
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/{id}/default/GoogleMapsCompatible/{z}/{y}/{x}.png', { maxZoom: 20, id: 'PHOTO2', label: '正射影像圖' }),
    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/{id}/default/GoogleMapsCompatible/{z}/{y}/{x}.png', { maxZoom: 20, id: 'LUIMAP', label: '土地利用現況圖' })
  ];
  // Basemaps Plugin 實作
  L.Control.Basemaps=L.Control.extend({_map:null,includes:L.Evented?L.Evented.prototype:L.Mixin.Event,options:{position:"bottomright",tileX:0,tileY:0,tileZ:0,layers:[]},basemap:null,onAdd:function(e){this._map=e;var t=L.DomUtil.create("div","basemaps leaflet-control closed");return L.DomEvent.disableClickPropagation(t),L.Browser.touch||L.DomEvent.disableScrollPropagation(t),this.options.basemaps.forEach(function(s,o){var a,i="basemap";if(0===o?(this.basemap=s,this._map.addLayer(s),i+=" active"):1===o&&(i+=" alt"),s.options.iconURL)a=s.options.iconURL;else{var l={x:this.options.tileX,y:this.options.tileY};if(a=L.Util.template(s._url,L.extend({s:s._getSubdomain(l),x:l.x,y:s.options.tms?s._globalTileRange.max.y-l.y:l.y,z:this.options.tileZ},s.options)),s instanceof L.TileLayer.WMS){s._map=e;var n=s.options.crs||e.options.crs,r=L.extend({},s.wmsParams),m=parseFloat(r.version);r[m>=1.3?"crs":"srs"]=n.code;var p=L.point(l);p.z=this.options.tileZ;var c=s._tileCoordsToBounds(p),d=n.project(c.getNorthWest()),h=n.project(c.getSouthEast()),v=(m>=1.3&&n===L.CRS.EPSG4326?[h.y,d.x,d.y,h.x]:[d.x,h.y,h.x,d.y]).join(",");a+=L.Util.getParamString(r,a,s.options.uppercase)+(s.options.uppercase?"&BBOX=":"&bbox=")+v}}var b=L.DomUtil.create("div",i,t),u=L.DomUtil.create("img",null,b);u.src=a,s.options&&s.options.label&&(u.title=s.options.label),L.DomEvent.on(b,"click",function(){if(this.options.basemaps.length>2&&L.Browser.mobile&&L.DomUtil.hasClass(t,"closed"))L.DomUtil.removeClass(t,"closed");else if(s!=this.basemap){e.removeLayer(this.basemap),e.addLayer(s),s.bringToBack(),e.fire("baselayerchange",s),this.basemap=s,L.DomUtil.removeClass(t.getElementsByClassName("basemap active")[0],"active"),L.DomUtil.addClass(b,"active");var a=(o+1)%this.options.basemaps.length;L.DomUtil.removeClass(t.getElementsByClassName("basemap alt")[0],"alt"),L.DomUtil.addClass(t.getElementsByClassName("basemap")[a],"alt"),L.DomUtil.addClass(t,"closed")}},this)},this),this.options.basemaps.length>2&&!L.Browser.mobile&&(L.DomEvent.on(t,"mouseenter",function(){L.DomUtil.removeClass(t,"closed")},this),L.DomEvent.on(t,"mouseleave",function(){L.DomUtil.addClass(t,"closed")},this)),this._container=t,this._container}});
  L.control.basemaps=function(e){return new L.Control.Basemaps(e)};
  map.addControl(L.control.basemaps({
    basemaps: basemaps,
    tileX: 854,
    tileY: 444,
    tileZ: 10
  }));
  // 上傳圖片本機預覽
  const imageInput = document.getElementById('image');
  const previewImage = document.getElementById('preview-image');
  imageInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        previewImage.src = e.target.result;
        previewImage.classList.add('visible');
      };
      reader.readAsDataURL(file);
    } else {
      previewImage.src = '';
      previewImage.classList.remove('visible');
    }
  });
  // ---------------------- PDF 產生核心邏輯 ----------------------
  async function generatePDF() {
    // 顯示 Loading 遮罩
    const loader = document.getElementById('loading-overlay');
    loader.style.display = 'flex';
    loader.querySelector('.spinner').textContent = "正在產生 PDF 報表中，請稍候...";
    try {
      // 1. 取得當前輸入的欄位值，並做好防呆回退
      const countyVal = document.getElementById('county_list').value || '';
      const townVal = document.getElementById('town_list').value || '';
      const villageVal = document.getElementById('village_list').options[document.getElementById('village_list').selectedIndex]?.text || '';
      const pmnoVal = document.getElementById('pmno').value.trim() || '未填寫';
      const pcnoVal = document.getElementById('pcno').value.trim() || '未填寫';
      const peopleVal = document.getElementById('people').value.trim() || '未填寫';
      const remarkVal = document.getElementById('message').value.trim() || '無個別備註';
      const occEl = document.getElementById('occupation_list');
      const occVal = occEl.options[occEl.selectedIndex]?.text || '請選擇';
      const brkEl = document.getElementById('break_list');
      const brkVal = brkEl.options[brkEl.selectedIndex]?.text || '請選擇';
      // 取得現在時間字串
      const now = new Date();
      const formattedTime = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      // 2. 進行關鍵的地圖 html2canvas 離屏快照
      let mapImgSrc = "";
      const mapElementOriginal = document.querySelector('#map');
      if (mapElementOriginal) {
        try {
          // 在截圖前短暫延遲，保證瓦片完全繪製
          await new Promise(resolve => setTimeout(resolve, 500));
          const canvas = await html2canvas(mapElementOriginal, {
            useCORS: true,
            scale: 2, // 提高解析度防模糊
            scrollX: 0,
            scrollY: -window.scrollY,
            logging: false
          });
          mapImgSrc = canvas.toDataURL('image/jpeg', 0.85);
        } catch (error) {
          console.error('地圖快照失敗:', error);
        }
      }
      // 3. 專門動態建立一個全新的、專為 A4 一頁式排版設計的 HTML 容器
      const exportContainer = document.createElement('div');
      exportContainer.className = 'pdf-export-container';
      const photoSrc = previewImage.src; // 取得上傳的相片 Base64
      // 建立 HTML 表格版面
      exportContainer.innerHTML = `
        <div class="pdf-header">
          <h2 class="pdf-title">南水分署土地盤點紀錄表</h2>
          <div class="pdf-meta">產出時間：${formattedTime}</div>
        </div>
        <table class="pdf-table">
          <tr>
            <th>盤點人員</th>
            <td>${peopleVal}</td>
            <th>土地地段</th>
            <td>${countyVal}${townVal} ${villageVal}</td>
          </tr>
          <tr>
            <th>地號</th>
            <td>${pmnoVal} - ${pcnoVal}</td>
            <th>佔用情形</th>
            <td style="color: ${occVal === '是' ? 'red' : 'inherit'}; font-weight: ${occVal === '是' ? 'bold' : 'normal'};">${occVal}</td>
          </tr>
          <tr>
            <th>設施異常/損壞</th>
            <td style="color: ${brkVal === '是' ? 'red' : 'inherit'}; font-weight: ${brkVal === '是' ? 'bold' : 'normal'};">${brkVal}</td>
            <th>備註說明</th>
            <td>${remarkVal}</td>
          </tr>
        </table>
        <div class="pdf-media-section">
          <div class="pdf-media-box">
            <h6>【 地理位置 】</h6>
            ${mapImgSrc ? `<img class="pdf-media-img" src="${mapImgSrc}" />` : `<div style="padding-top:60px; color:#aaa;">(無地圖快照資料)</div>`}
          </div>
          <div class="pdf-media-box">
            <h6>【 現場實景 】</h6>
            ${photoSrc && photoSrc.startsWith('data:') ? `<img class="pdf-media-img" src="${photoSrc}" />` : `<div style="padding-top:60px; color:#aaa; font-size:12px;">未上傳現場照片</div>`}
          </div>
        </div>
      `;
      // 4. 定義 html2pdf 參數（精確控制 1 頁，不縮減或刪除頁面）
      const docFilename = (countyVal || townVal || villageVal) 
        ? `${countyVal}${townVal}${villageVal}_土地盤點紀錄表.pdf` 
        : `南水分署土地盤點紀錄表_${now.toISOString().slice(0,10)}.pdf`;
      const opt = {
        margin: [10, 10, 10, 10], // 留白上下左右各 10mm
        filename: docFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' // 直式 A4
        }
      };
      // 5. 執行匯出 PDF 任務
      await html2pdf().set(opt).from(exportContainer).save();
    } catch (err) {
      console.error("PDF 匯出錯誤: ", err);
      alert("PDF 匯出過程中發生錯誤，請重新再試。");
    } finally {
      // 下載完成，關閉 Loading 畫面
      loader.style.display = 'none';
    }
  }
  // ---------------------- 地圖與資料載入邏輯 ----------------------
  const google_map_url = 'https://www.google.com/maps/search/?api=1&query=';
  async function loadAllData() {
    document.getElementById('loading-overlay').style.display = 'flex';
    try {
      const res1 = await fetch("https://joe123890508.github.io/wrasb_land.github.io/compared.json");
      window.global_json2 = await res1.json();
      const res2 = await fetch("https://joe123890508.github.io/wrasb_land.github.io/114wrasb_web.geojson");
      window.global_json = await res2.json();
      processGeoJson(window.global_json, window.global_json2);
    } catch (error) {
      console.error("資料載入失敗", error);
      alert("資料載入失敗，請稍後再試！");
    } finally {
      document.getElementById('loading-overlay').style.display = 'none';
    }
  }
  function processGeoJson(json, compareData) {
    json.features.forEach(feature => {
      let id1 = feature.properties.區域;
      feature.properties.區域 = compareData[id1] || "未知";
      let id2 = feature.properties.單位;
      feature.properties.單位 = compareData[id2] || "未知";
    });
    let data = json.features;
    let layersByCategory = {};
    function getColorByCategory(category) {
      const colorMap = {
        "牡管中心": "#198754",
        "高管中心": "#0d6efd",
        "秘書室": "#8a2be2",
        "資產科": "#ffc107",
        "阿管中心": "#32cd32",
        "工務科": "#008b8b",
        "曾管中心": "#ff6347",
        "甲管中心": "#ff7f50",
        "未知": "#6c757d",
      };
      return colorMap[category] || "#000000";
    }
    const controlLayers = L.control.layers(null, null, {collapsed: true}).addTo(map);
    data.forEach(feature => {
      let category = feature.properties.單位;
      if (!layersByCategory[category]) {
        layersByCategory[category] = L.geoJSON(null, {
          style: function () {
            return {
              weight: 1.5,
              color: getColorByCategory(category)
            };
          },
          onEachFeature: function (feature, layer) {
            layer.on("click", () => {
              let table_content = '<table class="table table-bordered table-sm m-0" style="font-size:0.85rem;">';
              for (let key in feature.properties) {
                table_content += `<tr><th class="bg-light" style="width:35%;">${key}</th><td>${feature.properties[key] || ''}</td></tr>`;
              }
              table_content += '</table>';
              document.getElementById("feature-info").innerHTML = table_content;
              document.getElementById("feature-title").innerHTML = "地號詳細資訊：" + (feature.properties['LANDNO'] || '');
              const myModal = new bootstrap.Modal(document.getElementById('featureModal'));
              myModal.show();
              const center = layer.getBounds().getCenter();
              const url = google_map_url + center.lat + ',' + center.lng;
              $('#google_map').off('click').on('click', function () {
                window.open(url);
              });
            });
          }
        });
        let color = getColorByCategory(category);
        let nameWithIcon = `
          <span style="
            display:inline-block;
            width:10px; height:10px;
            background:${color};
            margin-right:6px;
            border-radius:2px;
          "></span>${category}`;
        controlLayers.addOverlay(layersByCategory[category], nameWithIcon);
      }
      layersByCategory[category].addData(feature);
    });
    for (let category in layersByCategory) { map.addLayer(layersByCategory[category]); }
    var county_list = document.getElementById("county_list");
    document.getElementById("town_list").innerHTML = "<option value>請選擇鄉鎮</option>";
    document.getElementById("village_list").innerHTML = "<option value>請選擇地段</option>";
    let inner = "<option value>請選擇縣市</option>";
    let inner_list = [];
    json.features.forEach(feat => {
      let c = feat.properties.RCOUNTY;
      if (c && !inner_list.includes(c)) {
        inner += `<option value="${c}">${c}</option>`;
        inner_list.push(c);
      }
    });
    county_list.innerHTML = inner;
  }
  loadAllData();
  L.control.fullscreen({ position: 'topleft', forceSeparateButton: true, forcePseudoFullscreen: true }).addTo(map);
  function change_county(_county) {
    county = _county;
    document.getElementById("village_list").innerHTML = "<option value>請選擇地段</option>";
    var inner = "<option value>請選擇鄉鎮</option>";
    let inner_list = [];
    window.global_json.features.forEach(feat => {
      if (_county === feat.properties.RCOUNTY) {
        let townName = feat.properties.RTOWN;
        if (townName && !inner_list.includes(townName)) {
          inner += `<option value="${townName}">${townName}</option>`;
          inner_list.push(townName);
        }
      }
    });
    document.getElementById("town_list").innerHTML = inner;
  }
  function change_town(_town) {
    town = _town;
    var inner = "<option value>請選擇地段</option>";
    let inner_list = [];
    window.global_json.features.forEach(feat => {
      if (_town === feat.properties.RTOWN) {
        let villageNo = feat.properties.scno;
        if (villageNo && !inner_list.includes(villageNo)) {
          inner += `<option value="${villageNo}">${villageNo}</option>`;
          inner_list.push(villageNo);
        }
      }
    });
    document.getElementById("village_list").innerHTML = inner;
  }
  function change_village(_village) { village = _village; }
  // 查詢與定位地號
  document.getElementById("find_land").addEventListener("click", function () {
    let _selected = -1;
    let inputValue1 = document.getElementById("pmno").value.padStart(4, "0");
    let inputValue2 = document.getElementById("pcno").value.padStart(4, "0");
    for (let i = 0; i < window.global_json.features.length; i++) {
      let feat = window.global_json.features[i];
      if (village === feat.properties.scno) {
        if (inputValue1 === feat.properties.pmno) {
          if (inputValue2 === feat.properties.pcno) {
            _selected = i;
            break;
          }
        }
      }
    }
    if (_selected === -1) {
      window.alert("查無地號，請確認後重新查詢！");
    } else {
      const feature = window.global_json.features[_selected];
      let center;
      if (feature.geometry.type === "Point") {
        center = { lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] };
      } else {
        const layer = L.geoJSON(feature);
        center = layer.getBounds().getCenter();
      }
      map.flyTo(center, 18, { duration: 1.5 });
      L.popup().setLatLng(center).setContent("地號：" + feature.properties.LANDNO).openOn(map);
    }
  });
  // GPS 瀏覽器定位
  let gpsMarker = null;
  document.getElementById("get_gps").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("此瀏覽器不支援 GPS 定位！");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (gpsMarker) {
          map.removeLayer(gpsMarker);
        }
        gpsMarker = L.marker([lat, lng]).addTo(map);
        map.flyTo([lat, lng], 17);
      },
      (error) => {
        alert("GPS 定位失敗，原因代碼：" + error.code);
      }
    );
  });
  var featureModalEl = document.getElementById('featureModal');
  featureModalEl.addEventListener('show.bs.modal', function () {
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.dragging.disable();
  });
  featureModalEl.addEventListener('hidden.bs.modal', function () {
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    map.dragging.enable();
  });