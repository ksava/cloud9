/**
 * Code Editor for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var menus = require("ext/menus/menus");
var commands = require("ext/commands/commands");
var editors = require("ext/editors/editors");
var markup = require("text!ext/gotofile/gotofile.xml");
var search = require('ext/gotofile/search');
var filelist = require("ext/filelist/filelist");

module.exports = ext.register("ext/gotofile/gotofile", {
    name    : "Go To File",
    dev     : "Ajax.org",
    alone   : true,
    offline : false,
    type    : ext.GENERAL,
    markup  : markup,
    offline : false,

    dirty   : true,
    nodes   : [],

    hook : function(){
        var _self = this;

        var mnuItem = new apf.item({
        	command : "gotofile"
	    });
        
        commands.addCommand({
            name: "gotofile",
            hint: "search for a filename and jump to it",
            bindKey: {mac: "Command-E", win: "Ctrl-E"},
            exec: function () {
                _self.toggleDialog(1);
            }
        });

        this.nodes.push(
            menus.addItemByPath("File/Open...", mnuItem, 500),
            menus.addItemByPath("Goto/Goto File...", mnuItem.cloneNode(false), 100),
    
            this.model = new apf.model(),
            this.modelCache = new apf.model()
        );
                
        ide.addEventListener("init.ext/editors/editors", function(){
            _self.markupInsertionPoint = tabEditors;
            //tabEditors.appendChild(winGoToFile);
        });
        
        ide.addEventListener("extload", function(){
            _self.updateFileCache();
        });
    },

    init : function() {
        var _self = this;
        
        txtGoToFile.addEventListener("keydown", function(e){
            if (e.keyCode == 27)
                _self.toggleDialog(-1);
            
            else if (e.keyCode == 13){
                _self.openFile(true);

                ide.dispatchEvent("track_action", {type: "gotofile"});
                return false;
            }
            else if (dgGoToFile.xmlRoot) {
                if (e.keyCode == 38 && dgGoToFile.viewport.length) {
                    if (dgGoToFile.selected == dgGoToFile.$cachedTraverseList[0])
                        return;
                    
                    var prev = dgGoToFile.getNextTraverseSelected(dgGoToFile.selected, false);
                    if (prev) {
                        dgGoToFile.select(prev, e.ctrlKey, e.shiftKey);
                        dgGoToFile.focus();
                        e.preventDefault();
                    }
                }
                else if (e.keyCode == 40 && dgGoToFile.viewport.length && dgGoToFile.selected) {
                    var next = dgGoToFile.getNextTraverseSelected(dgGoToFile.selected);
                    if (next) {
                        dgGoToFile.select(next, e.ctrlKey, e.shiftKey);
                        dgGoToFile.focus();
                        e.preventDefault();
                    }
                }
            }
        });
        
        txtGoToFile.addEventListener("afterchange", function(e){
            _self.filter(txtGoToFile.value);
            
            if (_self.dirty && txtGoToFile.value.length > 0 && _self.modelCache.data) {
                _self.dirty = false;
                _self.updateFileCache(true);
            }
        });
        
        dgGoToFile.addEventListener("keydown", function(e) {
            if (e.keyCode == 27) {
                _self.toggleDialog(-1);
            }
            if (e.keyCode == 9) {
                txtGoToFile.focus();
                e.preventDefault();
            }
            else if (e.keyCode == 38 && !e.shiftKey) {
                if (this.selected == this.$cachedTraverseList[0])
                    txtGoToFile.focus();
            }
            else if (e.keyCode == 13) {
                _self.openFile(true);
                return false;
            }
            else if (apf.isCharacter(e.keyCode)) {
                txtGoToFile.focus();
                return;
            }
            
            e.preventDefault();
        }, true);

        apf.addListener(dgGoToFile.$ext, "mouseup", function(e) {
            _self.openFile();
        });
        
        winGoToFile.addEventListener("blur", function(e){
            if (winGoToFile.visible && !apf.isChildOf(winGoToFile, e.toElement))
                _self.toggleDialog(-1);
        });
        txtGoToFile.addEventListener("blur", function(e){
            if (self.winGoToFile && winGoToFile.visible 
              && !apf.isChildOf(winGoToFile, e.toElement))
                _self.toggleDialog(-1);
        });
        
        ide.addEventListener("closepopup", function(e){
            if (e.element != _self)
                _self.toggleDialog(-1, true);
        });
        
        this.nodes.push(winGoToFile);
    },
    
    updateFileCache : function(isDirty){
        var _self = this;

        filelist.getFileList(isDirty, function(data, state){
            if (state != apf.SUCCESS)
                return;

            /**
             * Putting this in a worker won't help
             * An alternative solution would be to do this in parts of 10ms
             */
            var array = data.replace(/^\./gm, "").split("\n");
            array.pop(); //remove trailing empty element;
            
            var start = "<d:href>";
            var end   = "</d:href>";
            var glue  = end + start;
            data = apf.getXml("<d:multistatus  xmlns:d='DAV:'><d:response>"
                + start + array.join(glue) + end + "</d:response></d:multistatus>");

            _self.arrayCache = array;
            _self.modelCache.load(data);
            
            if (self.winGoToFile && winGoToFile.visible && _self.lastSearch) {
                var search = _self.lastSearch;
                
                _self.lastSearch = null; //invalidate cache
                var state = {
                    sel : dgGoToFile.getSelection(), //store previous selection
                    caret : dgGoToFile.caret,
                    scrollTop : dgGoToFile.$viewport.getScrollTop()
                };
                
                _self.filter(search, state.sel.length);
                
                if (state.sel.length && state.sel.length < 100) {
                    var list = [], sel = state.sel;
                    for (var i = 0, l = sel.length; i < l; i++) {
                        list.push(dgGoToFile.queryNode("//d:href[text()='" 
                            + sel[i].firstChild.nodeValue + "']"));
                    }
                    dgGoToFile.selectList(list);
                    if (state.caret)
                        dgGoToFile.setCaret(dgGoToFile.queryNode("//d:href[text()='" 
                            + state.caret.firstChild.nodeValue + "']"));
                    dgGoToFile.$viewport.setScrollTop(state.scrollTop);
                }
            }
            else
                _self.model.load(_self.modelCache.data);
        });
    },
    
    /**
     * Searches through the dataset
     * 
     */
    filter : function(keyword, nosel){
        var data;
        
        if (!this.modelCache.data) {
            this.lastSearch = keyword;
            return;
        }
        
        if (!keyword)
            data = this.modelCache.data.cloneNode(true);
        else {
            var nodes;
    
            // Optimization reusing smaller result if possible
            if (this.lastSearch && keyword.indexOf(this.lastSearch) > -1)
                nodes = this.arrayCacheLastSearch;
            else
                nodes = this.arrayCache;
                
            var cache = [], xml = search(nodes, keyword, cache);
            data = apf.getXml(xml);
    
            this.arrayCacheLastSearch = cache;
        }
        
        this.lastSearch = keyword;
        
        this.model.load(data);
        
        // See if there are open files that match the search results
        // and the first if in the displayed results
        
        if (nosel)
            return;
        
        var pages = tabEditors.getPages(), hash = {};
        for (var i = pages.length - 1; i >= 0; i--) {
            hash[pages[i].id] = true;
        }
        
        var nodes = dgGoToFile.getTraverseNodes();
        for (var i = Math.max(dgGoToFile.$viewport.limit - 3, nodes.length - 1); i >= 0; i--) {
            if (hash[ide.davPrefix + nodes[i].firstChild.nodeValue]) {
                dgGoToFile.select(nodes[i]);
                return;
            }
        }
        
        var selNode = dgGoToFile.getFirstTraverseNode();
        if (selNode)
            dgGoToFile.select(selNode);
    },
    
    openFile: function(noanim){
        var nodes = dgGoToFile.getSelection();
        
        if (nodes.length == 0)
            return false;
            
        this.toggleDialog(-1, noanim, function(){
            for (var i = 0; i < nodes.length; i++) {
                var path = ide.davPrefix.replace(/[\/]+$/, "") + "/" 
                    + apf.getTextNode(nodes[i]).nodeValue.replace(/^[\/]+/, "");
                editors.showFile(path);
                ide.dispatchEvent("track_action", {type: "fileopen"});
            }
        });
    },
    
    gotofile : function(){
        this.toggleDialog();
        return false;
    },
    
    "_gotofilelegacy" : function(){
        this.toggleDialog();
        return false;
    },

    toggleDialog: function(force, noanim, callback) {
        if (!self.winGoToFile || !force && !winGoToFile.visible || force > 0) {
            if (self.winGoToFile && winGoToFile.visible)
                return;
            
            ext.initExtension(this);
            
            ide.dispatchEvent("closepopup", {element: this});

            winGoToFile.show();
            
            if (dgGoToFile.$model != this.model)
                dgGoToFile.setModel(this.model);
            
            //Hide window until the list is loaded, unless we don't have data yet
            if (!dgGoToFile.xmlRoot) {
                if (this.modelCache.data) {
                    apf.setOpacity(winGoToFile.$ext, 0);
                    
                    dgGoToFile.addEventListener("afterload", function(){
                        apf.setOpacity(winGoToFile.$ext, 1);
                        
                        dgGoToFile.removeEventListener("afterload", arguments.callee);
                    });
                }
                else {
                    dgGoToFile.$setClearMessage(dgGoToFile["loading-message"], "loading");
                    apf.setOpacity(winGoToFile.$ext, 1);
                }
            }
            else {
                apf.setOpacity(winGoToFile.$ext, 1);
            }
            
            txtGoToFile.select();
            txtGoToFile.focus();
            this.dirty = true; //@todo this can be optimized by only marking as dirty on certain events
            
            // If we had a filter and new content, lets refilter
            if (this.lastSearch) {
                var search = this.lastSearch;
                this.lastSearch = null; //invalidate cache
                this.filter(search);
            }
        }
        else if (self.winGoToFile && winGoToFile.visible) {
            if (!noanim) {
                winGoToFile.visible = false;
                
                //Animate
                apf.tween.single(winGoToFile, {
                    type     : "fade",
                    from     : 1,
                    to       : 0,
                    steps    : 5,
                    interval : 0,
                    control  : (this.control = {}),
                    onfinish : function(){
                        winGoToFile.visible = true;
                        winGoToFile.hide();
                        
                        if (editors.currentEditor && editors.currentEditor.ceEditor)
                            editors.currentEditor.ceEditor.focus();
                        
                        callback && callback();
                    }
                });
            }
            else {
                winGoToFile.hide();
                callback && callback();
            }
        }

        return false;
    },

    enable : function(){
        this.nodes.each(function(item){
            if (item.enable)
                item.enable();
        });
    },

    disable : function(){
        this.nodes.each(function(item){
            if (item.disable)
                item.disable();
        });
    },

    destroy : function(){
        commands.removeCommandByName("gotofile");
        
        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        winGoToFile.destroy(true, true);
        this.nodes = [];
    }
});

});
