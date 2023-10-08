class AddAssetModalController {
    constructor(emitter){
        this.emitter = emitter;
        this.model = {
            display: false,
            message: "",
            busy: false,
            item: {
                name:""
            },
            howMany: 0,
            current: 0,
            kind: "Unit",
            libraries: {
                original: [],
                value: ""
            }
        }
        this.emitter.on("showModal:addAsset",(librariesSpecification)=>{
            // libraries: 
            // selected
            this.model.libraries.original = librariesSpecification.libraries;
            this.model.libraries.value = librariesSpecification.selected.id;
            this.model.kind = librariesSpecification.selected.kind;
            
            
            this.model.message = "";
            this.model.display = true;
        })
        
    }

    static async getInstance(emitter){
        const a = new AddAssetModalController(emitter)        
        return a;
    }

    async _handleCancel(e, that){
        that.model.display = false
    }

    async _handleLibrariesChanged(e, that){

    }

    async _handleOK(e, that){
        that.model.busy = true;
        const assetsInfo = await that.processAddAsset(JSON.parse(that.model.message));
        const assetsByTypeObject = assetsInfo.reduce((result, item)=>{ 
            const typeId = item.name;

            result[typeId] = result[typeId] || [];            
            result[typeId].push(item);
            return result;
        }, Object.create(null))
        const assetsByType = []
        Object.keys(assetsByTypeObject).forEach((item)=>{
            assetsByType.push({
                id: `${Math.random().toString(36).substring(2, 24)}`,  
                name: "",
                kind: assetsByTypeObject[item][0].kind,
                created: assetsByTypeObject[item][0].created,
                variants: assetsByTypeObject[item],
                tags: [item],
                library: that.model.libraries.value
            });
        })

        that.emitter.emit("AddAssetModalController:json", assetsByType)
        // that.emitter.emit("AddAssetModalController:json", JSON.parse(that.model.message))
        that.model.busy = false
        that.model.display = false
    }

    async prepareFactory(assetJsonObject, kind){
        // Prepare Renderables Factory
        const specification = {
                name: "main",
                json: JSON.stringify(assetJsonObject),                    
                // pivotCorrection: "0.15,-0.3,0.1",
                autoPivotCorrection: true,
                filterByNames: kind == "Unit"?["_UNIT"]:["MAS"]
                // scaleCorrection: 0.01            
        }
        let factory = {};
        if(kind == "Unit"){
            factory = new hexmap3d.UnitRenderablesThreeJSFactory(new THREE.GLTFLoader());
            await factory.setSpecifications([specification])
            // await factory.loadTemplates(["_UNIT"]);            
        }else if (kind == "HexTile" || kind == "QuadTile"){
            factory = new hexmap3d.RenderablesThreeJSFactory(new THREE.GLTFLoader());            
            await factory.setSpecifications([specification]);            
        }
        // console.log(factory.spawnableRenderablesNames());

        return factory;
    }

    async preparePlaygroundAndView(canvas, emitter){
        const playgroundOptions = {
            enableScreenshots: true
        }
                
        let p = new hexmap3d.PlaygroundThreeJs(canvas,emitter, playgroundOptions);
        p.initialize();    
        let viewOptions = {
            cameraParams: {                
                fov: 100,
                near: 0.1,
                far: 1000,
                height: 0.25                             
            },
            cameraPosition: new THREE.Vector3(0,-1,0.75)
        }           
        let mainView = new hexmap3d.PlaygroundViewMainThreeJsDefault(emitter, viewOptions); 
        await p.attach(mainView);        
        mainView._setupScene(); 
        p.run();


        return {
            playground: p,
            view: mainView
        }
    }

    async prepareRenderer(kind, factory, view){
        // prepare Renderer
        let renderer = {};
        if(kind == "Unit"){            
            renderer = new hexmap3d.UnitsRendererThreeJS(this.emitter, new hexmap3d.HexFlatTopPositionProviderThreeJs(1), new hexmap3d.HexFlatTopOrientationProviderThreeJs());            
        }else if(kind == "HexTile"){
            renderer = new hexmap3d.MapHexFlatTopOddRendererThreeJs(3,2, this.emitter)            
        }else if(kind == "QuadTile"){
            renderer = new hexmap3d.MapQuadRendererThreeJs(3,2, this.emitter)
        }
        
        renderer.setRenderablesFactory(factory);
        renderer.setView(view);
        await renderer.initialize();


        return renderer;        
    }

    async prepareObjectsPlayer(canvas, assetJsonObject, kind, emitter){
        canvas.width = 250;
        canvas.height = 250;

        const playgroundAndView = await this.preparePlaygroundAndView(canvas, emitter);

        const factory = await this.prepareFactory(assetJsonObject, kind)
        const renderer = await this.prepareRenderer(kind, factory, playgroundAndView.view);

        return {            
            takeScreenShot: ()=>{
                return playgroundAndView.playground.takeScreenShot();
            },
            display: (...itemSpec)=>{
                renderer.put(...itemSpec);
            },
            remove: (item)=>{
                renderer.remove(item);
            },
            names: ()=>{
                return factory.spawnableRenderablesNames();
            },
            spawn: (item)=>{
                return factory.spawn(item)
            }
        }
    }

    async processAddAsset(assetJsonObject){
        let that = this;
        const assetsInfo = [];

        // const specification = {           
        //     main: {
        //         name: "main",
        //         json: JSON.stringify(assetJsonObject),                    
        //         // pivotCorrection: "0.15,-0.3,0.1",
        //         autoPivotCorrection: true
        //         // scaleCorrection: 0.01
        //     }
        // }
        // const specification = {           
        //     main: {
        //         name: "main",
        //         url: "../hexmap/assets/units.gltf",
        //         pivotCorrection: "0.15,-0.3,0.1"
        //     }
        // }
        // const unitFactory = new hexmap3d.UnitRenderablesThreeJSFactory(specification, new THREE.GLTFLoader());
        // await unitFactory.loadTemplates(["_UNIT"]);
        // console.log(unitFactory.spawnableRenderablesNames());
        
        // canvas for thumbnail generation
        var canvas = document.createElement('canvas');
        document.getElementById("unitCanvasHolder").appendChild(canvas);

        const player = await this.prepareObjectsPlayer(canvas, assetJsonObject, that.model.kind, this.emitter);

        // canvas.id = "temporaryCanvas"
        // canvas.style.display = 'none';
        // canvas.width = 250;
        // canvas.height = 250;
        
        // document.body.appendChild(canvas)
        

        // const playgroundOptions = {
        //     enableScreenshots: true
        // }
        
        // // let p = new hexmap3d.PlaygroundThreeJs(document.getElementById("unitCanvas"),this.emitter, playgroundOptions);
        // let p = new hexmap3d.PlaygroundThreeJs(canvas,this.emitter, playgroundOptions);
        // p.initialize();    
        // let viewOptions = {
        //     cameraParams: {                
        //         fov: 50,
        //         near: 0.1,
        //         far: 1000,
        //         height: 0.25                             
        //     },
        //     cameraPosition: new THREE.Vector3(0,-1,0.75)
        // }           
        // let mainView = new hexmap3d.PlaygroundViewMainThreeJsDefault(this.emitter, viewOptions); 
        // await p.attach(mainView);        
        // mainView._setupScene(); 
        // p.run();
        // const unitRenderer = new hexmap3d.UnitsRendererThreeJS(this.emitter, new hexmap3d.HexFlatTopPositionProviderThreeJs(1), new hexmap3d.HexFlatTopOrientationProviderThreeJs());
        // unitRenderer.setRenderablesFactory(unitFactory);
        // unitRenderer.setView(mainView);
        // await unitRenderer.initialize();


        // const spawnableNames = factory.spawnableRenderablesNames();     

        const spawnableNames = player.names();             
        console.log(spawnableNames)           
        that.model.howMany = spawnableNames.length;
        for(let j=0; j<spawnableNames.length; j++){
            that.model.current = j+1
            that.model.item.name = spawnableNames[j];
        

            let name = ""
            let renderableJSON = {}

            let item = {};

            if(that.model.kind == "Unit"){
                const tile = {
                    "id": "0,0",
                    "x": 0,
                    "y": 0,
                    "d": "S",
                    "t": "C_T_GRASS_1_TILE",
                    "r": "C_T_GRASS_1_TILE",
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

                item = {
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
                    uid: Math.random().toString(36).substring(2, 8),
                    unitSpecification: {
                        hitPoints: 10,
                        name: "Type",
                        tuid: spawnableNames[j].split("_")[0]
                    }
                }
                name = item.unitSpecification.tuid;

                player.display(item, tile,"SW");
                // renderer.put(item, tile,"SW"); 
                renderableJSON = player.spawn({unit: item}).data.toJSON();

            }else if(that.model.kind == "HexTile"){
                item = {
                    "id": "0,0",
                    "x": 0,
                    "y": 0,
                    "d": "S",
                    "t": spawnableNames[j],
                    "r": spawnableNames[j],
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
                name = spawnableNames[j]
                player.display(item,"SW");
                renderableJSON = player.spawn({name: name}).data.toJSON();
            }
            else if(that.model.kind == "QuadTile"){
                item = {
                    "id": "0,0",
                    "x": 0,
                    "y": 0,
                    "d": "S",
                    "t": spawnableNames[j],
                    "r": spawnableNames[j],
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
                name = spawnableNames[j]
                player.display(item,"S");
                renderableJSON = player.spawn({name: name}).data.toJSON();
            }



                       
            const waitForScreenshot = new Promise((resolve, reject)=>{
                setTimeout(()=>{                                        
                    resolve(player.takeScreenShot())
                },2000);
            })
            const screenshotDataUrl = await waitForScreenshot;
            // console.log(screenshotDataUrl)
            assetsInfo.push({   
                id: Math.random().toString(36).substring(2, 24),             
                name: name,
                fullName: spawnableNames[j],
                thumbnail: screenshotDataUrl,
                created: Date.now(),                
                renderableJSON: renderableJSON,
                kind: that.model.kind                
            });
            player.remove(item);
        }    

        ////// xxxx

        // const tile = {
        //     "id": "0,0",
        //     "x": 0,
        //     "y": 0,
        //     "d": "S",
        //     "t": "C_T_GRASS_1_TILE",
        //     "loc": {
        //       "n": "Grassland",
        //       "g": "43.74650403587078,7.421766928360976"
        //     },
        //     "ext": {},
        //     "nft": {
        //       "v": 100,
        //       "b": "ETHEREUM",
        //       "i": "123",
        //       "t": "0x123",
        //       "o": "0x0022"
        //     }
        // }

        // const spawnableNames = unitFactory.spawnableRenderablesNames();     
        // console.log(spawnableNames)           
        // that.model.howMany = spawnableNames.length;
        // for(let j=0; j<spawnableNames.length; j++){
        //     that.model.current = j+1
        //     that.model.item.name = spawnableNames[j];
        // // for(let j=0; j<1; j++){
        //     let unit = {
        //         actionPoints: 1,
        //         actionRunner: undefined,
        //         actionsAllowed: [],
        //         actionsQueue: [],
        //         attackStrength: (_unit)=>{ return 1},
        //         defendStrength: (_unit)=>{ return 1},
        //         gainBattleExperience: ()=>{},
        //         hitPoints: 5,
        //         rangeStrength: 10,
        //         strength: 10,
        //         sight: 2,
        //         uid: Math.random().toString(36).substring(2, 8),
        //         unitSpecification: {
        //             hitPoints: 10,
        //             name: "Type",
        //             tuid: spawnableNames[j].split("_")[0]
        //         }
        //     }
            
        //     unitRenderer.put(unit, tile,"SW");            
        //     const waitForScreenshot = new Promise((resolve, reject)=>{
        //         setTimeout(()=>{                                        
        //             resolve(p.takeScreenShot())
        //         },2000);
        //     })
        //     const screenshotDataUrl = await waitForScreenshot;

        //     // const screenshotDataUrl = p.takeScreenShot();
        //     // const screenshotDataUrl1 = p.takeScreenShot();
        //     // const screenshotDataUrl2 = p.takeScreenShot();
        //     // const screenshotDataUrl3 = p.takeScreenShot();
        //     // console.log(j, screenshotDataUrl);
        //     assetsInfo.push({
        //         id: unit.uid,
        //         name: unit.unitSpecification.tuid,
        //         fullName: spawnableNames[j],
        //         thumbnail: screenshotDataUrl,
        //         created: Date.now(),
        //         // renderable: unitFactory.spawn(unit).data.toJSON()
        //         renderableJSON: unitFactory.spawn(unit).data.toJSON()
                
        //     });
        //     unitRenderer.remove(unit);
        // }

       document.getElementById("unitCanvasHolder").removeChild(canvas);
        return assetsInfo;
        // window.playground = p;

        // let j = 0;
        // let unit = {
        //     actionPoints: 1,
        //     actionRunner: undefined,
        //     actionsAllowed: [],
        //     actionsQueue: [],
        //     attackStrength: (_unit)=>{ return 1},
        //     defendStrength: (_unit)=>{ return 1},
        //     gainBattleExperience: ()=>{},
        //     hitPoints: 5,
        //     rangeStrength: 10,
        //     strength: 10,
        //     sight: 2,
        //     uid: Math.random().toString(36).substring(2, 8),
        //     unitSpecification: {
        //         hitPoints: 10,
        //         name: "Type",
        //         tuid: spawnableNames[j].split("_")[0]
        //     }
        // }
        // unitRenderer.put(unit, tile,"SW");            
        // this.emitter.emit("playground:screenshot");

        
        // this.emitter.on("playground:screenshot:data",(dataUrl)=>{
        //     // console.log("Got screenshot")
        //     // console.log(dataUrl)
        //     // document.getElementById("preview").src = dataUrl;

        //     assetsData.push({
        //         name: unit.unitSpecification.tuid,
        //         fullName: spawnableNames[j],
        //         thumbnail: dataUrl

        //     });

        //     unitRenderer.remove(unit);

        //     if(j<spawnableNames.length-1){
        //         j++;
        //         unit = {
        //             actionPoints: 1,
        //             actionRunner: undefined,
        //             actionsAllowed: [],
        //             actionsQueue: [],
        //             attackStrength: (_unit)=>{ return 1},
        //             defendStrength: (_unit)=>{ return 1},
        //             gainBattleExperience: ()=>{},
        //             hitPoints: 5,
        //             rangeStrength: 10,
        //             strength: 10,
        //             sight: 2,
        //             uid: Math.random().toString(36).substring(2, 8),
        //             unitSpecification: {
        //                 hitPoints: 10,
        //                 name: "Type",
        //                 tuid: spawnableNames[j].split("_")[0]
        //             }
        //         }
        //         unitRenderer.put(unit, tile,"SW");            
        //         this.emitter.emit("playground:screenshot", unit.uid);
        //     }                
        // })

        // console.log(assetsData);
        
    }
}