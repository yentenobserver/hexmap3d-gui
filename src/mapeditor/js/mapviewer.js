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

class App {
    constructor(emitter) {
        
        this.emitter = emitter                    
        this.model = {
            parent: this, 
            
            mapJson: {
                value: ""
            },
            rsJson: {
                value: ""
            },
            logs: {
                value: ""
            },
            canvas: {},
            history: []
        }    
    }

    static async getInstance(emitter){
        const a = new App(emitter)
        await a._start();        
        return a;
    }

    async _start(){     
        const that = this;   
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

    async _handleRender(e, that){
        await that._startMap();
    }

    /**
     * 
     * @param {GngineMap} map 
     */
    async _startMap(){
        const map = JSON.parse(this.model.mapJson.value);    
        const that = this;

    

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
            
            let audit = {
                tile: selectedTile,
                renderable: {
                    uuid: tileInteractionEvent.interactingObject.uuid,
                    name: tileInteractionEvent.interactingObject.name,
                    type: tileInteractionEvent.interactingObject.type,
                    scale: tileInteractionEvent.interactingObject.scale,
                    worldPosition: tileInteractionEvent.worldPosition,                                        
                    localPosition: tileInteractionEvent.interactingObject.position                    
                }
            }

            if(selectedTile){
                that.model.history.unshift(audit);

                that.model.logs.value = "\n";

                that.model.history.forEach((item)=>{
                    let newRecord = "Tile clicked\n";
                    newRecord += JSON.stringify(item, null, 2);    
                    newRecord += "\n"
                    
                    that.model.logs.value += newRecord;

                })                
            }                
        })
        
        
        // remove previously instantiated map
        if(that.model.canvas && that.model.canvas.nodeName && that.model.canvas.nodeName.toLowerCase() == "canvas"){
            document.getElementById("map-holder").removeChild(that.model.canvas);
        }

        var canvas = document.createElement('canvas');
        canvas.className += " map playground";
        document.getElementById("map-holder").appendChild(canvas);
        
        that.model.canvas = canvas;

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


        //this.model.assets.original

        
        
        const renderableSpecificationsForMap = JSON.parse(this.model.rsJson.value);



        mapRenderablesSpecifications.push(...renderableSpecificationsForMap);

        const guiEngine = await hexmap3d.MapViewerComponent3JS.getInstance(map, mapRenderablesSpecifications, that.model.canvas, that.emitter, new THREE.GLTFLoader());              

        await guiEngine.gotoCenter();
        await guiEngine.registerIndicator("Helpers");
        

    }
}

