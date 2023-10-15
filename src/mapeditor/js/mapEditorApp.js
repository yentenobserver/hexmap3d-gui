/**
 * Describes ready to render map with all necessary assets' data.
 * @typedef {Object} GngineRenderableSpecification
 * @property {string} name - renderables specification name
 * @property {string} url - when provided then renderable data is retrieved from url
 * @property {string} json - when provided renderable data is retrieved/parsed from json
 * @property {string[]} filterByNames - when provided only renderables' data that match name condition is parsed/retrieved
 * @property {string} pivotCorrection - when provided pivot is applied for the renderable object
 * @property {number} groundLevel - when provided ground level for the renderable object is set to this value
 * @property {object} scaleCorrection - when provided the renderable object is scalled accordingly
 * @property {boolean} autoPivotCorrection - when provided the renderable object is pivoted automatically
 */
/**
 * Describes ready to render map with all necessary assets' data.
 * @typedef {Object} GngineMap
 * @property {object} specs - map specification
 * @property {array} tiles - tiles data
 * @property {array} assets - assets references' data
 */

/**
 * This is a lightweight object that stores (usually as a part of a list) all necessary data to uniquely 
 * identyfi Asset. It is a lightweigh version of the Asset object - it stores only refence/id data instead of the whole asset model 
 * that is stored in Asset object.
 * @typedef {Object} GngineAssetReference
 * @property {string} libId - asset's library id
 * @property {string} id - asset's id (unique within library)
 * @property {string} vId - asset's variant id
 */

/**
 * Represents asset's data.
 * @typedef {Object} GngineAsset
 * @property {object} specs - asset's specification
 * @property {object} variant - asset's variant
 */




class MapEngine {
    constructor(){
        this._engine = {}
    }

    static async getInstance(kind, mapSize, tiles){
        const widthHeight = mapSize.split("x").map((item)=>{return item.trim()});

        const r = new MapEngine();
        r._engine = kind == "HexTile"?new hexmap3d.MapHexOddQ(widthHeight[0],widthHeight[1]):new hexmap3d.MapSquare(widthHeight[0],widthHeight[1]);
        r._engine.fromTiles(tiles);
        return r;
    }  
    
    async put(tileBase){
        this._engine.put(tileBase);
    }
}
class MapGUIEngine {

    constructor(){
        this._playground = {};
        this._map = {
            mainView: {},
            hudView: {}
        }
        this._tiles = {
            assetFactory: {},
            renderer: {}
        }

        this.map = {
            changeTile: this._mapChangeTile.bind(this),
            center: this._mapCenter.bind(this),
            highlightTiles: this._mapHighlightTiles.bind(this),
            registerAreaIndicator: this._mapRegisterAreaIndicator.bind(this)
        }
        this.kind = undefined
        this.options = {}

    }
    static async getInstance(canvas, emitter, tileAssetsSpecificationsJSON, kind, mapSize, tiles, options){
        const p = new MapGUIEngine();
        p.kind = kind;
        p.options = options;
        const playgroundAndView = await p._preparePlaygroundAndView(canvas, emitter);
        p._map.mainView = playgroundAndView.view;
        p._playground = playgroundAndView.playground;
        p._map.hudView = playgroundAndView.hudView;

        p._tiles.assetFactory = await p._prepareFactory(tileAssetsSpecificationsJSON, kind);     
        p._tiles.renderer = await p._prepareRenderer(mapSize, kind, p._tiles.assetFactory, p._map.mainView, emitter, options);

        // const widthHeight = mapSize.split("x").map((item)=>{return item.trim()});
        
        for(let i=0; i<tiles.length; i++){
            const tile = tiles[i];
            p._tiles.renderer.put(tile, tile.d);
        }
        // for(let c = 0; c<widthHeight[0];c++){
        //     for(let r = 0; r<widthHeight[1]; r++){
        //         const tile = tiles[]

        //         p._tiles.renderer.put(tile, tile.d);
        //     }
        // }    
    
        return p;                
    }

    /**
     * 
     * @param {*} specifications 
     * @deprecated do not use
     */
    async addTileSpecifications(specifications){
        await this._tiles.assetFactory.setSpecifications(specifications);
    }
    

    async _preparePlaygroundAndView(canvas, emitter){
        const playgroundOptions = {
            enableScreenshots: true
        }
                
        let p = new hexmap3d.PlaygroundThreeJs(canvas,emitter, playgroundOptions);
        p.initialize();    
        // let viewOptions = {
        //     cameraParams: {                
        //         fov: 100,
        //         near: 0.1,
        //         far: 1000,
        //         height: 0.25                             
        //     },
        //     cameraPosition: new THREE.Vector3(0,-1,0.75)
        // }   
        let viewOptions = {
            cameraParams: {                
                fov: 50,
                near: 0.1,
                far: 1000,
                height: 0                             
            },
            cameraPosition: new THREE.Vector3(0,-5,4)
        }        
        let mainView = new hexmap3d.PlaygroundViewMainThreeJsDefault(emitter, viewOptions); 
        await p.attach(mainView);        
        mainView._setupScene(); 
        p.run();

        let hudView = new hexmap3d.PlaygroundViewHudThreeJsDefault(emitter);
        await p.attach(hudView);
        const hudRenderer = new hexmap3d.HudRendererThreeJs(emitter);
        hudRenderer.setView(hudView);

        const navComp = new hexmap3d.HudComponentMapNavigationThreeJs("./assets/map-navigations.png");
        await navComp.build();
        hudRenderer.addComponent(navComp); 


        return {
            playground: p,
            view: mainView,
            hudView: hudView
        }
    }

    async _prepareFactory(assetJsonObject, kind){
        let specification;

        if(assetJsonObject&&assetJsonObject.metadata&&assetJsonObject.metadata.type){
            // Prepare Renderables Factory
            specification = [{           
                
                    name: "main",
                    json: JSON.stringify(assetJsonObject),                    
                    // pivotCorrection: "0.15,-0.3,0.1",
                    autoPivotCorrection: true,
                    // scaleCorrection: 0.01
                    scaleCorrection: {
                        // byFactor: 1.2
                        autoFitSize: 1                
                    },
                    filterByNames: kind == "Unit"?["_UNIT"]:["MAS"]
            }]
        }else{
            specification = assetJsonObject
        }
        
        let factory = {};
        if(kind == "Unit"){
            factory = new hexmap3d.UnitRenderablesThreeJSFactory(new THREE.GLTFLoader());
            await factory.setSpecifications(specification);
        }else if (kind == "HexTile" || kind == "QuadTile"){
            factory = new hexmap3d.RenderablesThreeJSFactory(new THREE.GLTFLoader());            
            await factory.setSpecifications(specification);
        }
        // console.log(factory.spawnableRenderablesNames());

        return factory;
    }

    async _prepareRenderer(size, kind, factory, view, emitter, options){
        const widthHeight = size.split("x").map((item)=>{return item.trim()});
        // prepare Renderer
        let renderer = {};
        if(kind == "Unit"){            
            renderer = new hexmap3d.UnitsRendererThreeJS(emitter, new hexmap3d.HexFlatTopPositionProviderThreeJs(1), new hexmap3d.HexFlatTopOrientationProviderThreeJs());            
        }else if(kind == "HexTile"){
            renderer = new hexmap3d.MapHexFlatTopOddRendererThreeJs(widthHeight[0],widthHeight[1], emitter, options)            
        }else if(kind == "QuadTile"){
            renderer = new hexmap3d.MapQuadRendererThreeJs(widthHeight[0],widthHeight[1], emitter, options)
        }
        
        renderer.setRenderablesFactory(factory);
        renderer.setView(view);
        await renderer.initialize();        

        return renderer;        
    }

    async _mapCenter(){
        this._tiles.renderer.goToTile({
            x: Math.round(this._tiles.renderer.width/2),
            y: Math.round(this._tiles.renderer.height/2)
        })
    }

    async _mapChangeTile(tile, asset){
        // const theTile = JSON.parse(JSON.stringify(tile));
        const theTile = tile;
        theTile.r = asset.variant.fullName;        

        const availableSpecificationsNames = this._tiles.assetFactory.spawnableRenderablesNames();
        if(!availableSpecificationsNames.join(",").includes(theTile.r)){
            // load specification as it's missing from the factory
            const specs = {
                name: `${asset.specs.name}_${asset.specs.id}`,
                json: JSON.stringify(asset.variant.renderableJSON),                    
                // pivotCorrection: "0.15,-0.3,0.1",
                autoPivotCorrection: true,
                // scaleCorrection: 0.01
                scaleCorrection: {
                    // byFactor: 1.2
                    autoFitSize: 1                
                },
                filterByNames: ["MAS_"]
            }
            await this._tiles.assetFactory.setSpecifications([specs]);
        }
        
        this._tiles.renderer.put(theTile, theTile.d);

    }

    async _mapHighlightTiles(tiles, indicatorName, color){        
        this._tiles.renderer.highlightTiles(tiles, indicatorName, color);
    }

    async _mapRegisterAreaIndicator(name){
        const indicator =  this.kind == "HexTile"?await hexmap3d.HexAreaMapIndicator3Js.create(this._tiles.renderer):await hexmap3d.QuadAreaMapIndicator3Js.create(this._tiles.renderer)
        this._tiles.renderer.registerIndicator(name, indicator);
    }

}

class AssetManager {
    constructor(){
        this.assets = [] // holds all assets that were already loaded
        this.api = {}
    }

    static async  getInstance(){
        const r = new AssetManager();
        await r._start();
        return r;
    }

    async _start(){
        this.api = await Api.getInstance();
    }
    async getAssetsConfig(){
        return this.api.User3.assetsConfig();
    }
    /**
     * Returns assets for given assets' specifications
     * @param {GngineAssetReference[]} assetReferences references array
     * @returns {Promise<GngineAsset[]>}
     */
    async getAssets(assetReferences){
        const result = []
        const missingAssetsReferences = [];

        for(let i=0; i<assetReferences.length; i++){
            let asset = await this._findAsset(assetReferences[i]);
            if(!asset){
                missingAssetsReferences.push(assetReferences[i]);                
            }else{
                result.push(asset);
            }
            
        }

        let missingAssets = await this._loadAssets(missingAssetsReferences);
        if(missingAssets)
            this.assets.push(...missingAssets); // add it to the local cache              
        
        for(let i=0; i<missingAssetsReferences.length; i++){
            let asset = await this._findAsset(missingAssetsReferences[i]);            
            result.push(asset);
        }
        return result;
    }

    async getAssetsByLibraries(librariesIds){
        const allAssets = await this._loadAssetsByLibraries(librariesIds);

        const newAssets = allAssets.filter((item)=>{
            return !this.assets.some((value)=>{return value.variant.fullName.toLowerCase() == item.variant.fullName.toLowerCase()})
        })

        this.assets.push(...newAssets);

        return allAssets;
    }



    /**
     * Returns asset for given reference
     * @param {GngineAssetReference} assetReference asset reference
     * @returns {Promise<GngineAsset>}
     */
    async getAsset(assetReference){
        const assets = await this.getAssets([assetReference]);
        return assets[0];
    }

    /**
     * Finds asset in cache
     * @param {GngineAssetReference} assetReference 
     * @returns {Promise<GngineAsset>}
     */
    async _findAsset(assetReference){        
        let result;

        result = this.assets.find((item)=>{
            return item.specs.library == assetReference.libId 
                    && item.specs.id == assetReference.id 
                    && item.variant.fullName.trim().toLowerCase() == assetReference.vId.trim().toLowerCase()
            })

        // for(let i=0; i<this.assets.length; i++){
        //     const item = this.assets[i];

        //     if(item.variant.fullName.trim().toLowerCase() == assetReference.vId.trim().toLowerCase()){
        //         result = item
        //         break;
        //     }

        // }
        return result;        
    }

    /**
     * 
     * @param {GngineAssetReference[]} assetReferences 
     * @returns {GngineAsset[]}
     */
    async _loadAssets(assetReferences){
        return this._loadAssetsByLibraries(assetReferences.map(assetReference=>assetReference.libId));        
    }

    async _loadAssetsByLibraries(librariesIds){
        let assets = [];

        // get unique library ids
        
        const uniqueLibs = [...new Set(librariesIds)];


        for(let i=0; i<uniqueLibs.length; i++){

            const assetsSpecs = await this.api.User3.assetsSpecs(uniqueLibs[i]);
            // const assetsSpecs = await this._fetchFromURL(`./assets/${uniqueLibs[i]}`, "JSON");

            for(let i=0; i<assetsSpecs.length; i++){
                const item = assetsSpecs[i];

                for(let j=0; j<item.variants.length; j++){
                    const variant = item.variants[j];
                    assets.push({
                        specs: item,
                        variant: variant
                    })
                }                    
            }
        }   
        return assets;   

    }

    _fetchFromURL(url, type){
        return fetch(url).then((response)=>{
            if(type=='JSON')
                return response.json();
            else if(type=='TXT')
                return response.text();
            else return response.blob();
        })
    }
}

class App {
    constructor(emitter, mapCanvas) {
        
        this.emitter = emitter                    
        this.model = {
            parent: this,      
            game: {
                player: {},
                canvas: {}
            },
            process: {
                step: "ChooseKind" //
            },
            stepMapEdit: {
                terrainForm: {
                    terrainDict: {
                        value: "",
                        error: ""
                    },
                    terrainCustom: {
                        value: "",
                        error: ""
                    },
                    modificationsDict: {
                        value: "",
                        error: ""
                    },
                    modificationsCustom: {
                        value: "",
                        error: ""
                    },
                }
            },
            stepUseJson: {
                form: {
                    contents: {
                        value: "",
                        error: ""
                    },
                }
            },
            stepUseWizard: {
                form:{
                    name: {
                        value: "",
                        error: ""
                    },
                    kind: {
                        value: "HexTile",
                        error: ""
                    },
                    size: {
                        value: "16x10",
                        error: ""
                    },
                    tags: {
                        value: "",
                        error: ""
                    },
                    address: {
                        value: "",
                        error: ""
                    },
                    latlon: {
                        value: "",
                        error: ""
                    },
                    backgroundImageURL: {
                        value: "assets/europeelevation.eps.zoom-gr.png",
                        error: ""
                    }

                }
            },
            selected: {
                tile: {
                    data: {},
                    dataMulti:[],
                    renderable: {
                        worldPosition: "",
                        item: {}
                    },
                    asset: {},
                    
                },
                unit: {},
                unitData: {},
                unitDataStr: {},
                map: -1
            },
            assetsData: [],
            assets: {
                original: [],
                filtered: [],
                filter: "",
                hidden: true
            },
            maps: {
                original: [],
                filtered: [],
                filter: "",
                hidden: true
            },
            terrain: {
                hidden: true
            },
            handlers: {
                _handleChangeAsset: this._handleChangeAsset.bind(this)
            },
            mapCharacteristics: {
                id: "",
                name: "",
                kind: "",
                size: "",
                tags: [],
                address: "",
                latlon: []
            },
            deployments: {
                value: ""
            }

        }   
        this.guiEngine = {}  
        this.mapEngine = {}   
        this.assetManager = {}
        this.api = {}
        
        
    }

    static async getInstance(emitter, mapCanvas){
        const a = new App(emitter, mapCanvas)
        await a._start();        
        return a;
    }

    async _start(){     
        const that = this;   
        this.api = await Api.getInstance();
        this.model.maps.original = await this.api.User3.maps();
        this.model.selected.map = this.model.maps.original.length>0?this.model.maps.original[0].specs.id:-1
        this.emitter.on("interaction.*",(event)=>{
            // if(event.originalEvent.type=="pointerdown") {
            //     // console.log("Got both", event);
            //     // that.model.selected = {
            //     //     unit: {},
            //     //     unitData: {},
            //     //     unitDataStr: {},
            //     //     tile: {},
            //     //     tileData: {},
            //     //     tileDataStr: {},
            //     // }
            // }            
        })


    }

    async _handleHideAssetBrowser(e, that){
        that.model.assets.hidden = true;
        that.model.assets.filter = ""
    }

    async _handleShowAssetBrowser(e, that){
        that.model.assets.hidden = false;
        that.model.assets.filter = ""
    }

    async _handleShowTerrainEditor(e, that){
        that.model.terrain.hidden = false;
    }

    async _handleShowAssetsAndTerrain(e, that){
        that._handleShowAssetBrowser(e, that);
        that._handleShowTerrainEditor(e, that);
    }

    async _handleSpecialAreasChanged(e, that){
        const tiles = Array.from(that.model.parent.mapEngine._engine.theMap.values());

        if( that.model.deployments.value.startsWith("X_")){
            const theTiles = tiles.filter((item)=>{
                let hasConfig = true;
                let hasTerrainMissesRenderable = item.t && item.t.kind && !item.t.kind.includes("UNDEFINED") && (!item.r || item.r.includes("MAS_PLACEHOLDER"));
                let hasRenderableMissesTerrain = item.r && !item.r.includes("MAS_PLACEHOLDER") && (!item.t || !item.t.kind || item.t.kind.includes("UNDEFINED"))
                hasConfig = !(hasTerrainMissesRenderable || hasRenderableMissesTerrain)
                return !hasConfig;
            })
            that.model.parent.guiEngine.tileHighlight(theTiles, "Helpers","#E1341E");
        }else{
            const deploymentTiles = tiles.filter((item)=>{
                return item.t?.modifications?.includes(that.model.deployments.value)            
            })
            const colors = {
                RED_DEPLOYMENT: "#E1341E",
                BLUE_DEPLOYMENT: "#1E6AE1",
                GREEN_DEPLOYMENT: "#1EE196",
                YELLOW_DEPLOYMENT: "#CBE11E"
            }
            that.model.parent.guiEngine.tileHighlight(deploymentTiles, "Helpers",colors[that.model.deployments.value])
        }
        
    }

    async _handleTerrainChanged(e, that){
        
        that.model.stepMapEdit.terrainForm.terrainCustom.value = that.model.stepMapEdit.terrainForm.terrainCustom.value.toUpperCase();
        
        if(that.model.stepMapEdit.terrainForm.terrainDict.value == "CUSTOM"){
            that.model.selected.tile.data.t.kind = that.model.stepMapEdit.terrainForm.terrainCustom.value.replace(/\s/g,'');
            that.model.selected.tile.dataMulti.forEach((tile)=>{
                tile.t.kind = that.model.stepMapEdit.terrainForm.terrainCustom.value.replace(/\s/g,'');
            })
        }else{
            that.model.selected.tile.data.t.kind = that.model.stepMapEdit.terrainForm.terrainDict.value
            that.model.selected.tile.dataMulti.forEach((tile)=>{
                tile.t.kind = that.model.stepMapEdit.terrainForm.terrainDict.value
            })
        }


        that.mapEngine.put(that.model.selected.tile.data);
        that.model.selected.tile.dataMulti.forEach((tile)=>{
            that.mapEngine.put(tile);
        })
        // console.log("Terrain: ", that.model.selected.tile.data.t.kind);
        console.log("changed tile", that.model.selected.tile.data);
        that._handleSpecialAreasChanged(e, that);
    }

    async _handleModifiersChanged(e, that){
        
        that.model.stepMapEdit.terrainForm.modificationsCustom.value = that.model.stepMapEdit.terrainForm.modificationsCustom.value.toUpperCase();

        if(e.target.nodeName == "SELECT" && that.model.stepMapEdit.terrainForm.modificationsDict.value.join(",").includes("CUSTOM")){

            let customAlready = that.model.stepMapEdit.terrainForm.modificationsCustom.value.split(",").map((item)=>{return item.trim()});

            // remove those eventually deselected from dict - so leave only true custom
            customAlready = customAlready.filter((item)=>{return !["RAILWAY","ROAD","FORREST","BUILDING","RIVER","GLACIER","IMPASSABLE"].includes(item)})
            
            
            // add also those selected by dict
            let result = customAlready.concat(that.model.stepMapEdit.terrainForm.modificationsDict.value);
            
            result = result.filter((item, pos)=>{
                return result.indexOf(item) == pos;
            })
            that.model.stepMapEdit.terrainForm.modificationsCustom.value = result.filter((item)=>{return item != "CUSTOM" && item!=""}).join(", ");
        }
        if(e.target.nodeName == "SELECT" && !that.model.stepMapEdit.terrainForm.modificationsDict.value.join(",").includes("CUSTOM")){
            that.model.stepMapEdit.terrainForm.modificationsCustom.value = ""
        }
        
        if(that.model.stepMapEdit.terrainForm.modificationsDict.value.join(",").includes("CUSTOM")){
            that.model.selected.tile.data.t.modifications = that.model.stepMapEdit.terrainForm.modificationsCustom.value.replace(/\s/g,'').split(",");
        }else{
            that.model.selected.tile.data.t.modifications = that.model.stepMapEdit.terrainForm.modificationsDict.value
        }
        
        that.model.selected.tile.dataMulti.forEach((tile)=>{
            tile.t.modifications = that.model.selected.tile.data.t.modifications
        })

        // console.log("Modifications: ", that.model.selected.tile.data.t.modifications);
        that.mapEngine.put(that.model.selected.tile.data);
        that.model.selected.tile.dataMulti.forEach((tile)=>{
            that.mapEngine.put(tile);
        })
        console.log("changed tile", that.model.selected.tile.data);


        that._handleSpecialAreasChanged({}, that);
    }

    async _handleChangeAsset(e, that){    
        let tiles = [that.model.selected.tile.data];
        
        if(that.model.selected.tile.dataMulti.length>0){
            tiles = that.model.selected.tile.dataMulti
        }

        for(let i=0; i<tiles.length; i++){
            const tile = tiles[i];
            // const newTile = JSON.parse(JSON.stringify(tile));
            const newTile = tile;
            newTile.r = that.item.variant.fullName;        
    
            that.model.parent.guiEngine.tileChange(newTile, that.item);
                    
            that.model.selected.tile.data = newTile;
            that.model.parent.mapEngine._engine.put(newTile);
    
            // console.log("changed tile", that.model.selected.tile.data);
        }

        that._handleSpecialAreasChanged(e, that);
        
    }

    async _loadAssets(map){
        this.model.assets.original = [];
        this.model.assets.filtered = [];

        // public assets
        const publicLibraries = await this.api.User3.publicLibraries();
        const publicLibrariesIds = publicLibraries.map((item)=>{return item.id});
        
        const publicAssets = await this.model.assetManager.getAssetsByLibraries(publicLibrariesIds);
        // user assets
        const userLibraries = await this.api.User3.libraries();        
        const userLibrariesIds = userLibraries.map((item)=>{return item.id}).filter((item)=>{return !publicLibrariesIds.includes(item)});

        const userAssets = await this.model.assetManager.getAssetsByLibraries(userLibrariesIds);

        // load default assets
        // const defaultAssets = await this.model.assetManager.getAssetsByLibraries([`${map.specs.kind}/assets.json`]);
        // const mapAssets = await this.model.assetManager.getAssets(map.assets||[]);

        // const all = [...defaultAssets, ...mapAssets];
        const all = [...publicAssets, ...userAssets];

        // load map specific assets (if any)
        this.model.assets.original = all.filter((item, idx)=>{return all.indexOf(item) == idx});

        console.log(`Loaded ${this.model.assets.original.length} assets`);

        // const assetsSpecs = await this.loadAsset(`./assets/${kind =="HexTile"?"hex":"quad"}/assets.json`, "JSON");
        // for(let i=0; i<assetsSpecs.length; i++){
        //     const item = assetsSpecs[i];

        //     const variant = item.variants[0];

        //     this.model.assets.original.push({
        //         specs: item,
        //         variant: variant.
        //     })                                                        
        // }        
    }

    async _applyAssetFilter(){
        this.model.assets.filtered = [];

        const searchPhrase = this.model.assets.filter.toLowerCase();

        searchPhrase.split(/\s+/g)

        this.model.assets.filtered = this.model.assets.original.filter((item)=>{
            return item.specs.name.toLowerCase().split(/\s+/g).some((item)=>{return searchPhrase.includes(item)})
            || item.variant.fullName.toLowerCase().includes(searchPhrase) 
            || item.specs.id.toLowerCase().includes(searchPhrase) 
            || item.specs.tags.join(",").toLowerCase().includes(searchPhrase)
        })
    }

    


    async _findAsset(renderableName){
        // const assetsSpecs = []

        // const assetsSpecs = await this.loadAsset(`./assets/${kind =="HexTile"?"hex":"quad"}/assets.json`, "JSON");

        const assetsSpecs = this.model.assets.original;

        let result = {
            specs: {},
            variant: {}
        }

        // export interface AssetVariantSpecs {        
        //     fullName: string // variant name, this is used by renderer when selecting renderable for render
        //     thumbnail: string // variant thumbnail image in data url format
        //     created: number // creation timestamp
        //     renderable: string  // json string representation that can be rendered by renderer    
        // }
        
        // export interface AssetSpecs{
        //     id: string      // unique id
        //     name: string    // user readable name of asset
        //     description: string 
        //     kind: "Unit" | "HexTile" | "QuadTile" // kind of asset
        //     created: number // creation timestamp
        //     variants: AssetVariantSpecs[]    // variants of the asset
        //     tags: string[]  // tags associated with asset
        // }

        // export interface Asset {
        //     specs: AssetSpecs,
        //     variant: AssetVariantSpecs
        // }
        for(let i=0; i<assetsSpecs.length; i++){
            const item = assetsSpecs[i];

            if(item.variant.fullName.trim().toLowerCase() == renderableName.trim().toLowerCase()){
                result = item
                break;
            }

        }
        return result;        
    }

    async _handleStepChooseKind(e, that){
        that.model.process.step =  e.target.dataset.nextStep;
        console.log(that.model.process.step)
    }   
    
    async _handleLoadMap(e, that){
        that.model.process.step = "MapEdit";
        const map = that.model.maps.original.find((item)=>{return item.specs.id == that.model.selected.map});
        that._startMap(map);
    }

    async _handleStepUseWizard(e, that){
        that.model.process.step =  e.target.dataset.nextStep;

        if(that.model.process.step == "ChooseKind"){
            //clear form
            that.model.stepUseWizard.form = {
                name: {
                    value: "",
                    error: ""
                },
                kind: {
                    value: "HexTile",
                    error: ""
                },
                size: {
                    value: "16x10",
                    error: ""
                },
                tags: {
                    value: "",
                    error: ""
                },
                address: {
                    value: "",
                    error: ""
                },
                latlon: {
                    value: "",
                    error: ""
                }

            }
        }
        if(that.model.process.step == "MapEdit"){
            that.model.stepUseWizard.form.tags.value += `, ${that.model.stepUseWizard.form.size.value}, ${that.model.stepUseWizard.form.kind.value}`
            that._startMap({
                specs: {
                    id: Math.random().toString(36).substring(2, 24),   
                    name: that.model.stepUseWizard.form.name.value,
                    kind: that.model.stepUseWizard.form.kind.value,
                    size: that.model.stepUseWizard.form.size.value,
                    tags: that.model.stepUseWizard.form.tags.value.split(",").map((item)=>{return item.trim()}).filter((item)=>{return item.length>0}),
                    address: that.model.stepUseWizard.form.address.value.trim(),
                    latlon: that.model.stepUseWizard.form.latlon.value.split(",").map((item)=>{return item.trim()}),
                    options: {
                        backgroundImgUrl: that.model.stepUseWizard.form.backgroundImageURL.value
                    }
                    
                }
            });
        }
    }

    async _handleStepUseJson(e, that){
        that.model.process.step =  e.target.dataset.nextStep;

        if(that.model.process.step == "ChooseKind"){
            //clear form
            that.model.stepUseJson.form = {
                contents: {
                    value: "",
                    error: ""
                }                
            }
            return
        }

        let map;

        try{
            map = JSON.parse(that.model.stepUseJson.form.contents.value)

            if(!map.specs)
                throw new Error(`Incorrect specification. "specs" element is missing`)
            if(!map.tiles)
                throw new Error(`Incorrect specification. "tiles" array is missing`)
            if(!map.assets)
                throw new Error(`Incorrect specification. "assets" array is missing`)
        }catch(error){
            that.model.stepUseJson.form.contents.error = new Error(`Invalid map file contents: ${error.message}`)
            that.model.process.step = "UseJson"
            return;
        }

        if(that.model.process.step == "MapEdit"){
            that._startMap(map)
        }
    }


    async _onTileSelected(tileBase){
        const tileData = tileBase;
        const that = this;
        that.model.selected.tile.data = tileData;

        // reset prior setting
        that.model.stepMapEdit.terrainForm.terrainDict.value = "";
        that.model.stepMapEdit.terrainForm.terrainCustom.value = "";
        that.model.stepMapEdit.terrainForm.modificationsDict.value = "";
        that.model.stepMapEdit.terrainForm.modificationsCustom.value = "";

        if(["UNDEFINED","MOUNTAINS","PLAINS","GRASSLANDS","DIRTS","HILLS","DESERTS","SEAS","OCEANS","LAKES","COASTAL"].includes(tileData.t.kind)){
            that.model.stepMapEdit.terrainForm.terrainDict.value = tileData.t.kind
        }else{
            that.model.stepMapEdit.terrainForm.terrainDict.value = "CUSTOM"
            that.model.stepMapEdit.terrainForm.terrainCustom.value = tileData.t.kind
        }

        // const found = tileData.t.modifications.every(r=> ["RAILWAY","ROAD","FORREST","BUILDING","RIVER","GLACIER","IMPASSABLE"].includes(r))

        if(tileData.t.modifications&&tileData.t.modifications.every(r=> ["RAILWAY","ROAD","FORREST","BUILDING","RIVER","GLACIER","IMPASSABLE"].includes(r))){
            that.model.stepMapEdit.terrainForm.modificationsDict.value = tileData.t.modifications
        }else if(tileData.t.modifications){
            // there are some custom modifications
            that.model.stepMapEdit.terrainForm.modificationsDict.value = tileData.t.modifications;
            that.model.stepMapEdit.terrainForm.modificationsCustom.value = tileData.t.modifications.join(",")            
            if(!that.model.stepMapEdit.terrainForm.modificationsDict.value.includes("CUSTOM"))
                that.model.stepMapEdit.terrainForm.modificationsDict.value.push("CUSTOM");            
        }
        const assetSpecification = await that._findAsset(that.model.selected.tile.data.r);

        that.model.selected.tile.asset = assetSpecification;
    }

    /**
     * 
     * @param {GngineMap} map 
     */
    async _startMap(map){
        const mapCharacteristics = map.specs;
        let tiles = map.tiles;
        this.model.assetManager = await AssetManager.getInstance();

        const that = this;
        this.model.mapCharacteristics = mapCharacteristics;
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

        // this.emitter.on(hexmap3d.Events.INTERACTIONS.TILE+"$",async (event)=>{            
        //     if(event.originalEvent.type=="pointerdown") {
        //         // console.log('TILE', event)
        //         for(let i=event.data.hierarchy.length-1; i>= 0; i--){
        //             if(event.data.hierarchy[i].userData.tileData){                
        //                 const tileData = event.data.hierarchy[i].userData.tileData                                            
        //             }
        //         }
        //         // that.model.selected.tile = event.interactingObject
        //         // that.model.selected.tile.worldPosition = event.worldPosition

        //         that.model.selected.tile.renderable.item = event.interactingObject;
        //         that.model.selected.tile.renderable.worldPosition = event.worldPosition;

        //         console.log('TILE',that.model.selected.tile);

        //         const assetSpecification = await that._findAsset(that.model.selected.tile.data.r);

        //         that.model.selected.tile.asset = assetSpecification;
        //     };                                    
        // });

        this.emitter.on(hexmap3d.Events.INTERACTIONS.MAP.TILE,async (tileInteractionEvent)=>{
            console.log("tile interaction", tileInteractionEvent);

            // which tile is "the last selected"            
            let selectedTile =  tileInteractionEvent.operation == "GROUP_REMOVE"?tileInteractionEvent.selected[Math.max(tileInteractionEvent.selected.length-1,0)]:tileInteractionEvent.click;
            
            that.model.selected.tile.dataMulti = tileInteractionEvent.selected
            if(selectedTile)
                that._onTileSelected(selectedTile);

        })
        
        
        // remove previously instantiated map
        if(that.model.game.canvas && that.model.game.canvas.nodeName && that.model.game.canvas.nodeName.toLowerCase() == "canvas"){
            document.getElementById("map-holder").removeChild(that.model.game.canvas);
        }

        var canvas = document.createElement('canvas');
        canvas.className += " map playground";
        document.getElementById("map-holder").appendChild(canvas);
        
        that.model.game.canvas = canvas;

        // load all necessary assets
        await this._loadAssets(map);
        await this._applyAssetFilter();
        const assetsConfig = await this.model.assetManager.getAssetsConfig();


        const mapRenderablesSpecifications = [            
            {
                name: "mapHelpers",
                json: JSON.stringify(hexmap3d.RENDERABLES.MAP.SQUARE.highlight),                    
                pivotCorrection: "0,0,0.12",
                scaleCorrection: {
                    // byFactor: 1.2
                    autoFitSize: 1                
                },
                filterByNames: ["MAP_HLPR_HIGHLIGHT"]
            }
        ]
        if(!tiles){
            tiles = [];
            const widthHeight = mapCharacteristics.size.split("x").map((item)=>{return item.trim()});

            for(let c = 0; c<widthHeight[0];c++){
                for(let r = 0; r<widthHeight[1]; r++){
                    const tile = {
                        "id": `${c},${r}`,
                        "x": `${c}`,
                        "y": `${r}`,
                        "d": "S",
                        "r": "MAS_PLACEHOLDER_TILE",
                        "t": {"kind": "UNDEFINED"}                 
                    }
                    tiles.push(tile);
                }
            }
            // map.assets = [{
            //     libId: map.specs.kind == "HexTile"?"3haerbnuju":"QuadTile/assets.json",  
            //     id: "7muco5e2p8o", 
            //     vId: "MAS_PLACEHOLDER_TILE" 
            // }]
            map.tiles = tiles;
            map.assets = [
                assetsConfig.map.placeholderReference
            ]
        }

        //this.model.assets.original

        
        
        const renderableSpecificationsForMap = await this._renderablesSpecificationForMap(map);

        mapRenderablesSpecifications.push(...renderableSpecificationsForMap);

        // // get all unique "r" renderable keys for map items
        // let map = new Map();
        // tiles.forEach((item)=>{
        //     map.set(item.r,item);
        // })

        // const uniqueRs = Array.from(map.keys());

        // for(let i=0; i< uniqueRs.length; i++){
            
        //     const asset = await that._findAsset(uniqueRs[i]);

        //     const specs = {         
        //         name: `${asset.specs.name}_${asset.specs.id}`,
        //         json: JSON.stringify(asset.variant.renderableJSON),                                    
        //         autoPivotCorrection: true,                
        //         scaleCorrection: {                    
        //             autoFitSize: 1                
        //         },
        //         filterByNames: ["MAS_"]
        //     }
        //     // add additional specifications required by map
        //     mapRenderablesSpecifications.push(specs);
        // }
                

            
        
        const guiEngine = await hexmap3d.MapViewerComponent3JS.getInstance(map, mapRenderablesSpecifications, that.model.game.canvas, that.emitter, new THREE.GLTFLoader());      
        // const guiEngine = await MapGUIEngine.getInstance(that.model.game.canvas, that.emitter, mapRenderablesSpecifications, mapCharacteristics.kind, mapCharacteristics.size, tiles, mapCharacteristics.options );
        const mapEngine = await MapEngine.getInstance(mapCharacteristics.kind, mapCharacteristics.size, tiles)
        that.guiEngine = guiEngine;
        that.mapEngine = mapEngine;

        await that.guiEngine.gotoCenter();
        await that.guiEngine.registerIndicator("Helpers");
        

    }

    /**
     * Generates renderables specification for tiles in provided map
     * @param {GngineMap} map target map
     * @returns {Promise<GngineRenderableSpecification[]>} array of renderables' specifications
     */
    async _renderablesSpecificationForMap(map){
        
        const result = [];               
        const assets = await this.model.assetManager.getAssets(map.assets);

        for(let i=0; i<assets.length; i++){
            
            const asset = assets[i];

            const specs = {         
                name: `${asset.specs.name}_${asset.specs.id}`,
                json: JSON.stringify(asset.variant.renderableJSON),                                    
                autoPivotCorrection: true,                
                scaleCorrection: {                    
                    autoFitSize: 1                
                },
                filterByNames: ["MAS_"]
            }
            // add additional specifications required by map
            result.push(specs);
        }
        return result;
    }

    /**
     * Extracts and builds asset references from map tile data
     * @param {*} tiles 
     * @returns 
     */
    async _assetReferences(tiles){
        const references = [];
        const uniqueTilesR = [...new Set(tiles.map(tile => tile.r))];

        uniqueTilesR.forEach((tileR)=>{
            const asset = this.model.assets.original.find((asset)=>{
                return asset.variant.fullName.toLowerCase() == tileR.toLowerCase()
            })

            references.push({
                libId: asset.specs.library, // asset's library id
                id: asset.specs.id, // asset's id (unique within library)
                vId: asset.variant.fullName // asset's variant id
            })
        })

        return references;        
    }
    

    async _handleExportMap(e, that){

        // export interface MapSpecs {
        //     name: string,
        //     kind: string,
        //     size: string,
        //     tags: string[],
        //     address: string,
        //     latlon: string[]
        // }
        // export interface Map {
        //     specs: MapSpecs,
        //     tiles: TileBase[],
        //     assets: AssetReference[]
        // }
        const result = {
            specs: {},
            tiles: []
        }
        result.specs = that.model.mapCharacteristics
        result.tiles = Array.from(that.mapEngine._engine.theMap.values());
        result.assets = await that._assetReferences(result.tiles);

        navigator.clipboard.writeText(JSON.stringify(result));        
    }
    async _handlePublishMap(e, that){
        const result = {
            specs: {},
            tiles: []
        }
        result.specs = that.model.mapCharacteristics
        result.specs.isPublic = true;
        result.tiles = Array.from(that.mapEngine._engine.theMap.values());
        result.assets = await that._assetReferences(result.tiles);

        await that.api.User3.putMap(result);
    }

    /**
     * Extracts assets data used in the map and exports them as assets specification
     * @param {*} e 
     * @param {*} that 
     */
    async _handleDownloadAssetsSpecification(e, that){
        const result = await that._prepareAssetsForExport();        
        that._downloadJson(result, `${that.model.mapCharacteristics.name}_assets`);
    }

    /**
     * Extracts assets data used in the map and exports them as assets specification
     * @param {*} e 
     * @param {*} that 
     */
    async _handleCopyAssetsSpecification(e, that){
        const result = await that._prepareAssetsForExport();    
        
        navigator.clipboard.writeText(JSON.stringify(result));
    }

    async _prepareAssetsForExport(){
        const that = this;

        const result = [];

        const tiles = Array.from(that.mapEngine._engine.theMap.values());

        const assets = [];

        tiles.forEach((tile)=>{
            const asset = that.model.assets.original.find((asset)=>{
                return asset.variant.fullName.toLowerCase() == tile.r.toLowerCase()
            })
            // add asset only once, to have unique array of assets used in map
            if(!assets.find(item=>item.specs.id == asset.specs.id && item.specs.library == asset.specs.library))
                assets.push(asset)
        })        
        
        assets.forEach((asset)=>{
            asset.specs.variants.forEach((variant)=>{
                // AssetSpecs
                const data = {

                    name: `${asset.specs.name}_${asset.specs.id}`,
                    json: JSON.stringify(variant.renderableJSON),                                    
                    autoPivotCorrection: true,                
                    scaleCorrection: {                    
                        autoFitSize: 1                
                    },
                    filterByNames: ["MAS_"]
                }
                result.push(data);
            })            
        })
        return result;
    }

    async _handleDownloadMap(e, that){

        // export interface MapSpecs {
        //     name: string,
        //     kind: string,
        //     size: string,
        //     tags: string[],
        //     address: string,
        //     latlon: string[]
        // }
        // export interface Map {
        //     specs: MapSpecs,
        //     tiles: TileBase[],
        //     assets: AssetReference[]
        // }
        const result = {
            specs: {},
            tiles: []
        }
        result.specs = that.model.mapCharacteristics
        result.tiles = Array.from(that.mapEngine._engine.theMap.values());
        result.assets = await that._assetReferences(result.tiles);

        that._downloadJson(result, result.specs.name)
    }


    async _downloadJson(object, name) {
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



    async _handleFilter(e, that){        
        // that.model.assets.filtered = that.model.assets.original.filter((item)=>{return item.name.toLowerCase().includes(that.model.assets.filter) || item.tags.join(",").toLowerCase().includes(that.model.assets.filter) })
        that._applyAssetFilter();

    }

    // loadAsset(url, type){
    //     return fetch(url).then((response)=>{
    //         if(type=='JSON')
    //             return response.json();
    //         else if(type=='TXT')
    //             return response.text();
    //         else return response.blob();
    //     })
    // }

    handleDebugDumpTile(e, that){
        const result = JSON.stringify(that.model.selected.tile.toJSON());
        console.log(result);
    }

    handleDebugDumpUnit(e, that){
        const result = JSON.stringify(that.model.selected.unit.toJSON());
        console.log(result);
    }
}

