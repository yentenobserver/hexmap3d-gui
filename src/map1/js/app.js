class AppDemo {
    constructor(emitter, mapCanvas) {
        this.playground = {};
        this.emitter = emitter
        this.mapCanvas = mapCanvas
        this.assets3DLoader = new THREE.GLTFLoader();
        this.map = new hexmap3d.MapSquare(2,3);
        this.mapRenderer = {};
        this.model = {
            selected: {
                unit: {},
                unitData: {},
                unitDataStr: {},
                tile: {},
                tileData: {},
                tileDataStr: {},
            }
        }
    }
    static async getInstance(emitter, mapCanvas){
        const a = new AppDemo(emitter, mapCanvas)
        await a._start();
        return a;
    }

    async _start(){

        // this.emitter.on(hexmap3d.Events.INTERACTIONS.TILE,(e)=>{console.log('TILE',e.originalEvent.type)});
        // this.emitter.on(hexmap3d.Events.INTERACTIONS.UNIT,(e)=>{console.log('UNIT', e)});
        // this.emitter.on(hexmap3d.Events.INTERACTIONS.HUD,(e)=>{console.log('HUD', e)});


        


        let that = this;
        let p = new hexmap3d.PlaygroundThreeJs(this.mapCanvas,this.emitter);
        p.initialize();
        
        let mapRenderer;

        let mainMapView = new hexmap3d.PlaygroundViewMainThreeJsDefault(this.emitter); 

        await p.attach(mainMapView);
        
        mainMapView._setupScene(); 
        p.run();
        

        this.playground = p;
        const mapRenderablesSpecification = {
            
                name: "mapAssets",
                url: "./assets/models-prod.gltf",
                pivotCorrection: "-0.5,-0.5,0",
                filterByNames: ["MAS"],
                scaleCorrection: {
                    // byFactor: 1.2
                    autoFitSize: 1
                },  
        }
        const mapHelpersSpecification = {
                name: "mapHelpers",
                json: JSON.stringify(hexmap3d.RENDERABLES.MAP.SQUARE.highlight),                    
                pivotCorrection: "0,0,0.12",
                filterByNames: ["MAP_HLPR_HIGHLIGHT"]
        }
        let mapTileFactory = new hexmap3d.RenderablesThreeJSFactory(new THREE.GLTFLoader());
        await mapTileFactory.setSpecifications([mapRenderablesSpecification, mapHelpersSpecification]);
        mapRenderer = new hexmap3d.MapQuadRendererThreeJs(3,2, this.emitter)
        mapRenderer.setRenderablesFactory(mapTileFactory);
        // map renderer will render map tiles into main map view
        mapRenderer.setView(mainMapView);

        // const l2 = new THREE.GLTFLoader()
        // l2.load("./assets/i1.gltf",(item)=>{                
        //     // console.log(""+JSON.stringify(item.scene.toJSON()));       
        // })
    
        
        const mapjson = await this.loadAsset("./assets/map.json", "JSON");
        
        that.map.fromTiles(mapjson);
        
            // now let's download 3d assets for renderer
        await mapRenderer.initialize();
        
        that.map.theMap.forEach((val, _key) => {
            mapRenderer.put(val, val.d);
        });
        
        let hudView = new hexmap3d.PlaygroundViewHudThreeJsDefault(this.emitter);
        await p.attach(hudView);

        const hudRenderer = new hexmap3d.HudRendererThreeJs(this.emitter);
        hudRenderer.setView(hudView);

        const navComp = new hexmap3d.HudComponentMapNavigationThreeJs("./assets/map-navigations.png");
        await navComp.build();
        hudRenderer.addComponent(navComp); 

        const unitsRenderablesSpecification = {
            
                name: "unitsAssets",
                url: "./assets/units.gltf",
                // pivotCorrection: "0.15,-0.3,0.1"
                autoPivotCorrection: true,
                scaleCorrection: {
                    // byFactor: 1.2
                    autoFitSize: 0.45
                },
                groundLevel: 0.11
            
            // helpers: {
            //     name: "mapHelpers",
            //     json: JSON.stringify(hexmap3d.RENDERABLES.MAP.SQUARE.highlight),                    
            //     pivotCorrection: "0,0,0.12"
            // }
        }
        const unitFactory = new hexmap3d.UnitRenderablesThreeJSFactory(new THREE.GLTFLoader());
        await unitFactory.setSpecifications([unitsRenderablesSpecification]);
        const unitRenderer = new hexmap3d.UnitsRendererThreeJS(this.emitter, mapRenderer, mapRenderer);
        unitRenderer.setRenderablesFactory(unitFactory);
        unitRenderer.setView(mainMapView);
        await unitRenderer.initialize();
        const tile = {
            "id": "0,1",
            "x": 1,
            "y": 0,
            "d": "S",
            "t": {"kind": "PLAINS"},
            "loc": {
              "n": "Grassland",
              "g": "43.74650403587078,7.421766928360976"
            },
            "ext": {},
            "nft": {
              "v": 100,
              "b": "ETHEREUM",
              "i": "123",
              "t": "0x123",
              "o": "0x0022"
            }
        }
        const tile2 = {
            "id": "1,0",
            "x": 0,
            "y": 1,
            "d": "S",
            "t": {"kind": "PLAINS"},
            "loc": {
              "n": "Bushland",
              "g": "43.74650403587078,7.421766928360976"
            },
            "ext": {},
            "nft": {
              "v": 100,
              "b": "ETHEREUM",
              "i": "123",
              "t": "0x123",
              "o": "0x0022"
            }
          }
          const tile3 = {
            "id": "2,1",
            "x": 2,
            "y": 1,
            "d": "S",
            "t": {"kind": "PLAINS"},
            "loc": {
              "n": "Bushland",
              "g": "43.74650403587078,7.421766928360976"
            },
            "ext": {},
            "nft": {
              "v": 100,
              "b": "ETHEREUM",
              "i": "123",
              "t": "0x123",
              "o": "0x0022"
            }
          }
        const unit = {
            actionPoints: 1,
            actionRunner: undefined,
            actionsAllowed: [],
            actionsQueue: [],
            attackStrength: (_unit)=>{ return 1},
            defendStrength: (_unit)=>{ return 1},
            gainBattleExperience: ()=>{},
            hitPoints: 5,
            flag: "#FF0000",
            rangeStrength: 10,
            strength: 10,
            sight: 2,
            uid: "u1",
            unitSpecification: {
                hitPoints: 10,
                name: "Type",
                tuid: "T34"
            }
        }
        const unit2 = {
            actionPoints: 1,
            actionRunner: undefined,
            actionsAllowed: [],
            actionsQueue: [],
            attackStrength: (_unit)=>{ return 1},
            defendStrength: (_unit)=>{ return 1},
            gainBattleExperience: ()=>{},
            hitPoints: 1,
            rangeStrength: 10,
            strength: 10,
            sight: 2,
            uid: "u2",
            flag: "#FF0000",
            unitSpecification: {
                hitPoints: 10,
                name: "Type",
                tuid: "T34"
            }
        }
        const unit3 = {
            actionPoints: 1,
            actionRunner: undefined,
            actionsAllowed: [],
            actionsQueue: [],
            attackStrength: (_unit)=>{ return 1},
            defendStrength: (_unit)=>{ return 1},
            gainBattleExperience: ()=>{},
            hitPoints: 10,
            rangeStrength: 10,
            strength: 10,
            sight: 2,
            uid: "u3",
            flag: "#0000FF",
            unitSpecification: {
                hitPoints: 10,
                name: "Type",
                tuid: "T34"
            }
        }
        unitRenderer.put(unit, tile,"S");
        unitRenderer.put(unit2, tile2,"E");
        unitRenderer.put(unit3, tile3,"E");

        this.mapRenderer = mapRenderer;
        this.emitter.on("interaction.*",(event)=>{
            if(event.originalEvent.type=="pointerdown") {
                // console.log("Got both", event);
                // that.model.selected = {
                //     unit: {},
                //     unitData: {},
                //     unitDataStr: {},
                //     tile: {},
                //     tileData: {},
                //     tileDataStr: {},
                // }
            }            
        })

        this.emitter.on(hexmap3d.Events.INTERACTIONS.UNIT,(event)=>{
            if(event.originalEvent.type=="pointerdown") {
                

                // console.log('UNIT', event)
                for(let i=event.data.hierarchy.length-1; i>= 0; i--){
                    if(event.data.hierarchy[i].userData.unitData){                
                        const unitData = event.data.hierarchy[i].userData.unitData                                            
                        that.model.selected.unitData = unitData
                        that.model.selected.unitDataStr = JSON.stringify(unitData, null, "\t");
                        that.model.selected.unitDataStr = that.model.selected.unitDataStr.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );
                    //     output = JSON.stringify( output, null, '\t' );
			        // output = output
                    }
                }
                that.model.selected.unit = event.interactingObject;
                that.model.selected.unit.worldPosition = event.worldPosition;
                // console.log(that.model.selected.unit);
            }
            
        });

        this.emitter.on(hexmap3d.Events.INTERACTIONS.TILE,(event)=>{
            if(event.originalEvent.type=="pointerdown") {
                // console.log('TILE', event)
                for(let i=event.data.hierarchy.length-1; i>= 0; i--){
                    if(event.data.hierarchy[i].userData.tileData){                
                        const tileData = event.data.hierarchy[i].userData.tileData                    
                        window.mgr_tiles.push(tileData);
                        that.model.selected.tileData = tileData
                        that.model.selected.tileDataStr = JSON.stringify(tileData, null, "\t");
                        that.model.selected.tileDataStr = that.model.selected.tileDataStr.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );
                    //     output = JSON.stringify( output, null, '\t' );
			        // output = output
                    }
                }
                that.model.selected.tile = event.interactingObject
                that.model.selected.tile.worldPosition = event.worldPosition
            };
            
            
            // console.log('TILE',event.originalEvent.type)
        });
    }

    loadAsset(url, type){
        return fetch(url).then((response)=>{
            if(type=='JSON')
                return response.json();
            else if(type=='TXT')
                return response.text();
            else return response.blob();
        })
    }

    handleDebugDumpTile(e, that){
        const result = JSON.stringify(that.model.selected.tile.toJSON());
        console.log(result);
    }

    handleDebugDumpUnit(e, that){
        const result = JSON.stringify(that.model.selected.unit.toJSON());
        console.log(result);
    }

    downloadJson(object, name) {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(object));
        if(document && document.body){
            var element = document.createElement('a');
            element.setAttribute("href", dataStr);
            element.setAttribute("download", name + ".json");
            document.body.appendChild(element); // required for firefox
            element.click();
            element.remove();
        }
        
    }

    // download(filename, text) {
    //     var element = document.createElement('a');
    //     element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    //     element.setAttribute('download', filename);
    
    //     element.style.display = 'none';
    //     document.body.appendChild(element);
    
    //     element.click();
    
    //     document.body.removeChild(element);
    // }
}

