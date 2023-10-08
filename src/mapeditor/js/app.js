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
            },
            assetsData: [],
            assets: {                
                original: [],
                filtered: [],
                filter: ""
            },
            libraries:{                
                original: [
                    {name: "lib name", id:"asdasd"}
                ],
                value: "-1",
                selected: {}
            },
            busy: false

        }
        this.api = {}
        this.emitter.on("AddAssetModalController:json",this.processAddAsset.bind(this))
        this.emitter.on("AddTagsModalController:item",this.processAddTags.bind(this))
        this.emitter.on("AddLibraryModal:item",this.processAddLibrary.bind(this))
        this.f = {
            _handleAddTags: this._handleAddTags.bind(this)
        }
        
        
    }
    static async getInstance(emitter, mapCanvas){
        const a = new AppDemo(emitter, mapCanvas)
        await a._start();
        return a;
    }

    async _start(){
        this.api = await Api.getInstance();
        await this._loadLibraries();
        await this._loadAssets();
    }

    async _loadLibraries(){
        
        this.model.libraries.original = await this.api.User3.libraries();        
        this.model.libraries.original.sort((a,b)=>{return a.name.localeCompare(b.name)})
    }

    async _loadAssets(){
        this.model.assets.original = await this.api.User3.assetsSpecs(this.model.libraries.value);
        this.model.assets.filtered = this.model.assets.original 
    }

    async _handleLibrariesChanged(e, that){
        
        if(that.model.libraries.value == "_CREATE"){
            that.emitter.emit("showModal:addLibrary", {a:""});
            return;
        }
        that.model.busy = true;
        await that._loadAssets();        
        that.model.libraries.selected = that.model.libraries.original.find((item)=>item.id == that.model.libraries.value)        
        that.model.busy = false;
    }

    async _handleFilter(e, that){        
        that.model.assets.filtered = that.model.assets.original.filter((item)=>{return item.name.toLowerCase().includes(that.model.assets.filter) || item.tags.join(",").toLowerCase().includes(that.model.assets.filter) })
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

    async _previewUnit3D(parentElement, width, height){
        const specification = {           
            main: {
                name: "main",
                json: JSON.stringify(assetJsonObject),                    
                // pivotCorrection: "0.15,-0.3,0.1",
                // scaleCorrection: 0.01
            }
        }
    }

    async _handleAddTags(e, that){                
        const asset = that.model.assets.original.find((item)=>{return item.id == e.target.dataset.id})
        that.emitter.emit("showModal:addTags",asset);

    }

    async _handeCopy2ClipboardAsset(e, that){
        const asset = that.model.assets.original.find((item)=>{return item.id == e.target.dataset.id})        

        const data = {
            id: asset.id,
            created: asset.created,
            kind: asset.kind,
            name: asset.name,
            tags: asset.tags,
            variants: asset.variants,
            description: asset.description,
            library: `${asset.kind}/assets.json`            
        }

        navigator.clipboard.writeText(JSON.stringify(data));
    }

    async _handleDelete(e, that){
        that.model.busy = true;
        const assets = that.model.assets.filtered.filter((item)=>{return item.selected});
        const result = [];

        that.model.assets.original = that.model.assets.original.filter((item)=>{return !assets.some((item2)=>{return item2.id == item.id})});

        await that.processAddPublicLibrary(that.model.libraries.selected)
        that.model.busy = false;
    }

    async _handleCopy2ClipboardLibrary(e, that){
        const assets = that.model.assets.filtered.filter((item)=>{return item.selected});
        const result = [];

        assets.forEach((asset)=>{
            const data = {
                id: asset.id,
                created: asset.created,
                kind: asset.kind,
                name: asset.name,
                tags: asset.tags,
                variants: asset.variants,
                description: asset.description,
                library: `${asset.kind}/assets.json`
            }
            result.push(data);

        })
        navigator.clipboard.writeText(JSON.stringify(result));
    }

    async _handleCopy2ClipboardLibraryAsRenderablesArray(e, that){
        const assets = that.model.assets.filtered.filter((item)=>{return item.selected});
        const result = [];

        assets.forEach((asset)=>{
            asset.variants.forEach((variant)=>{
                // AssetSpecs
                const data = {

                    name: `${asset.name}_${asset.id}`,
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
        navigator.clipboard.writeText(JSON.stringify(result));
    }


    async _handlePublishLibrary(e, that){
        that.model.libraries.selected.isPublic = true;
        await that.processAddPublicLibrary(that.model.libraries.selected)
    }

    async processAddPublicLibrary(libraryReference){
        
        const library = {
            specs: libraryReference,
            assets: this.model.assets.original
        }
        
        library.specs.version += 1;        
        await this.api.User3.putLibraryWithAssets(library);        
        // this.model.assets.original = this.model.assets.original.map((item)=>{item.that = this; return item;})
        await this._loadLibraries();
        this.model.libraries.value = library.specs.id
        await this._handleLibrariesChanged({},this);
    }
    
    async processAddLibrary(item){        
        const library = {
            specs: {
                id: `${Math.random().toString(36).substring(2, 12)}`,
                name: item.name,
                isPublic: item.isPublic,
                kind: item.kind,
                version: 1
            },
            assets: []
        }                
        await this.api.User3.putLibraryWithAssets(library);        
        await this._loadLibraries();
        this.model.libraries.value = library.specs.id
        await this._handleLibrariesChanged({},this);
    }

    async processAddTags(asset){
        this.model.busy = true;
        const item = this.model.assets.original.find((item)=>{return item.id == asset.id})
        item.tags = asset.tags;
        console.log("Asset with tags added", asset, item)
        await this.processAddPublicLibrary(this.model.libraries.selected)
        console.log("Saved", asset, item)
        this._handleFilter({}, this);
        this.model.busy = false;
    }

    async processAddAsset(assetsInfo){
        // assetsInfo.forEach((item)=>{item.that = this})

        this.model.assets.original = this.model.assets.original.filter((item)=>{return assetsInfo.findIndex((item2)=>{return item2.id == item.id && item.kind == item2.kind }) == -1 })
        this.model.assets.original = this.model.assets.original.concat(assetsInfo);

        this.model.assets.filtered = this.model.assets.original 


        await this.processAddPublicLibrary(this.model.libraries.selected)                
        await this._loadAssets();                 
    }
    handleDebugDumpTile(e, that){
        const result = JSON.stringify(that.model.selected.tile.toJSON());
        console.log(result);
    }

    handleDebugDumpUnit(e, that){
        const result = JSON.stringify(that.model.selected.unit.toJSON());
        console.log(result);
    }

    handleAddAsset(e, that){
        that.emitter.emit("showModal:addAsset",{
            libraries: that.model.libraries.original,
            selected: that.model.libraries.original.find((item)=>{return item.id == that.model.libraries.value})
        });
    }
}

