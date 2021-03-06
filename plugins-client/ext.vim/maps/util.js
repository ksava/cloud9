"use strict";

define(function(require, exports, module) {
var registers = require("ext/vim/registers");
var ide = require("core/ide");

module.exports = {
    onVisualMode: false,
    onVisualLineMode: false,
    currentMode: 'normal',
    insertMode: function(editor) {
        var _self = this;

        ide.dispatchEvent("vim.changeMode", { mode : "insert" });

        _self.currentMode = 'insert';
        // Switch editor to insert mode
        editor.unsetStyle('insert-mode');

        var cursors = document.getElementsByClassName("ace_cursor");
        if (cursors && cursors.length) {
            for (var i = 0, l = cursors.length; i < l; ++i) {
                cursors[i].removeAttribute("style"); // fall back to ace theme
            }
        }

        editor.setOverwrite(false);
        editor.keyBinding.$data.buffer = "";
        editor.keyBinding.$data.state = "insertMode";
        _self.onVisualMode = false;
        _self.onVisualLineMode = false;
        if(_self.onInsertReplaySequence) {
            // Ok, we're apparently replaying ("."), so let's do it
            editor.commands.macro = _self.onInsertReplaySequence;
            editor.commands.replay(editor);
            _self.onInsertReplaySequence = null;
            _self.normalMode(editor);
        } else {
            // Record any movements, insertions in insert mode
            if(!editor.commands.recording)
                editor.commands.toggleRecording();
        }
    },
    normalMode: function(editor) {
        // Switch editor to normal mode
        this.currentMode = 'normal';
        
        ide.dispatchEvent("vim.changeMode", { mode : "normal" });

        editor.setStyle('normal-mode');
        editor.clearSelection();

        var cursors = document.getElementsByClassName("ace_cursor");
        if (cursors && cursors.length) {
            for (var i = 0, l = cursors.length; i < l; ++i) {
                cursors[i].style.display = null;
                cursors[i].style.backgroundColor = "red";
                cursors[i].style.opacity = ".5";
                cursors[i].style.border = "0";
            }
        }

        var pos;
        if (!editor.getOverwrite()) {
            pos = editor.getCursorPosition();
            if (pos.column > 0)
                editor.navigateLeft();
        }
        editor.setOverwrite(true);
        editor.keyBinding.$data.buffer = "";
        editor.keyBinding.$data.state = "start";
        this.onVisualMode = false;
        this.onVisualLineMode = false;
        // Save recorded keystrokes
        if(editor.commands.recording) {
            editor.commands.toggleRecording();
            return editor.commands.macro;
        }
        else {
            return [];
        }
    },
    getRightNthChar: function(editor, cursor, char, n) {
        var line = editor.getSession().getLine(cursor.row);
        var matches = line.substr(cursor.column + 1).split(char);

        return n < matches.length ? matches.slice(0, n).join(char).length : 0;
    },
    getLeftNthChar: function(editor, cursor, char, n) {
        var line = editor.getSession().getLine(cursor.row);
        var matches = line.substr(0, cursor.column).split(char);

        return n < matches.length ? matches.slice(-1 * n).join(char).length + 2 : 0;
    },
    toRealChar: function(char) {
        if (char.length === 1)
            return char;

        if (/^shift-./.test(char))
            return char[char.length - 1].toUpperCase();
        else
            return "";
    },
    copyLine: function(editor) {
        var pos = editor.getCursorPosition();
        editor.selection.clearSelection();
        editor.moveCursorTo(pos.row, pos.column);
        editor.selection.selectLine();
        registers._default.isLine = true;
        registers._default.text = editor.getCopyText().replace(/\n$/, "");
        editor.selection.clearSelection();
        editor.moveCursorTo(pos.row, pos.column);
    }
};
});
