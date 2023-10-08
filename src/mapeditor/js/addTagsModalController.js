class AddTagsModalController {
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
                    value: "",
                    errorMsg: "",
                },
                f3: {
                    value: "",
                    errorMsg: "",
                }
            },
            item: {},
            howMany: 0,
            current: 0,
            notify: {
                errors: []
            }
        }
        this.emitter.on("showModal:addTags",(item)=>{
            this.model.notify.errors = [];
            this.model.form = {
                f1: {
                    value: item.name,
                    errorMsg: "",
                },
                f2: {
                    value: item.description,
                    errorMsg: "",
                },
                f3: {
                    value: "",
                    errorMsg: "",
                }
            }
            this.model.message = item.tags.join(",") || "" ;
            this.model.form.f3.value = item.tags.join(",") || "" ;
            this.model.display = true;
            this.model.item = item

            console.log(this);
        })
        
    }

    static async getInstance(emitter){
        const a = new AddTagsModalController(emitter)        
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
                value: "",
                error: undefined,
            },
            f3: {
                value: "",
                error: undefined,
            }
        }
    }

    async _handleNotifyClose(e, that){
        that.model.notify.errors = []
    }

    async _handleOK(e, that){
        that.model.busy = true;

        that.model.notify.errors = []
        that.model.form.f1.error = undefined;
        that.model.form.f2.error = undefined;
        that.model.form.f3.error = undefined;      

        if(!that.model.form.f1.value || that.model.form.f1.value.length < 4){
            that.model.busy = false;
            that.model.notify.errors.push(new Error("Name must be at least 4 chars long"))  ;
            that.model.form.f1.error = new Error("Name must be at least 4 chars long")
            return;  
        }
        
        if(!that.model.form.f2.value || that.model.form.f2.value.length < 4){
            that.model.busy = false;
            that.model.notify.errors.push(new Error("Description must be at least 4 chars long"))  ;
            that.model.form.f2.error = new Error("Description must be at least 4 chars long");
            return;  
        }

        // update item object 
        that.model.item.tags = that.model.form.f3.value.split(",").map((item)=>{return item.trim()})
        that.model.item.tags = that.model.item.tags.filter((item)=>{return item})

        that.model.item.name = that.model.form.f1.value;
        that.model.item.description = that.model.form.f2.value;
        
        that.emitter.emit("AddTagsModalController:item", that.model.item)        
        that.model.busy = false
        that.model.display = false
        
        console.log(that.model.item);
    }
}