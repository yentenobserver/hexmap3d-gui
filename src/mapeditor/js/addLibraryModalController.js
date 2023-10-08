class addLibraryModalController {
    constructor(emitter){
        this.emitter = emitter;
        this.model = {
            display: false,
            message: "",
            busy: false,
            form: {
                f1: {
                    value: "",
                    errorMsg: "",
                },
                f2: {
                    value: false,
                    errorMsg: "",
                },
                
            },
            item: {},
            notify: {
                errors: []
            }
        }
        this.emitter.on("showModal:addLibrary",(item)=>{
            this.model.notify.errors = [];
            this.model.form = {
                f1: {
                    value: "",
                    errorMsg: "",
                },
                f2: {
                    value: false,
                    errorMsg: "",
                },
                f3: {
                    value: "HexTile",
                    errorMsg: "",
                }

            }
            
            this.model.display = true;
            this.model.item = item

            
        })
        
    }

    static async getInstance(emitter){
        const a = new addLibraryModalController(emitter)        
        return a;
    }

    async _handleCancel(e, that){
        that.model.notify.errors = [];
        that.model.display = false;
        that.model.form = {
            f1: {
                value: "",
                error: undefined,
            },
            f2: {
                value: false,
                errorMsg: "",
            },
            f3: {
                value: "HexTile",
                errorMsg: "",
            }
        }
    }

    async _handleNotifyClose(e, that){
        that.model.notify.errors = []
        that.model.item = {};
    }

    async _handleOK(e, that){
        that.model.busy = true;

        that.model.notify.errors = []
        that.model.form.f1.error = undefined;
        that.model.form.f2.error = undefined;     
        
        that.model.item = {}

        if(!that.model.form.f1.value || that.model.form.f1.value.length < 4){
            that.model.busy = false;
            that.model.notify.errors.push(new Error("Name must be at least 4 chars long"))  ;
            that.model.form.f1.error = new Error("Name must be at least 4 chars long")
            return;  
        }
                
        that.model.item = {
            name: that.model.form.f1.value,
            isPublic: that.model.form.f2.value,
            kind: that.model.form.f3.value
        }
        that.emitter.emit("AddLibraryModal:item", that.model.item)        
        that.model.busy = false
        that.model.display = false                
    }
}