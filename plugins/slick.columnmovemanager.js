/*!
 * @license
 * slickGrid v2.3.18-alpha.1011 (https://github.com/GerHobbelt/SlickGrid)
 * Copyright 2009-2015 Michael Leibman <michael{dot}leibman{at}gmail{dot}com>
 *
 * Distributed under MIT license.
 * All rights reserved.
 */



(function ($) {
  // register namespace
  $.extend(true, window, {
    Slick: {
      ColumnMoveManager: ColumnMoveManager
    }
  });

  function ColumnMoveManager(options) {
    var _grid;
    var _canvas;
    var _dragging;
    var _self = this;
    var _handler = new Slick.EventHandler();
    var _defaults = {
      cancelEditOnDrag: false
    };

    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      _canvas = _grid.getCanvasNode();
      _handler
        .subscribe(_grid.onHeaderDragInit, handleDragInit)
        .subscribe(_grid.onHeaderDragStart, handleDragStart)
        .subscribe(_grid.onHeaderDrag, handleDrag)
        .subscribe(_grid.onHeaderDragEnd, handleDragEnd);
    }

    function destroy() {
      _handler.unsubscribeAll();
    }

    function handleDragInit(e, dd) {
      var cell = _grid.getCellFromEvent(e, {
        clipToValidRange: true
      });
      assert(cell && cell.sourceInfo && cell.sourceInfo.source === "headers");
      assert(cell && cell.sourceInfo && cell.sourceInfo.subSource === "header");

      if (!cell) {
        return;
      }

      if (!/move|selectAndMove/.test(_grid.getColumns()[cell.cell].behavior)) {
        return;
      }

      // prevent the grid from cancelling drag'n'drop by default
      //e.stopImmediatePropagation();
      e.preventDefault();
    }

    function handleDragStart(e, dd) {
      var cell = _grid.getCellFromEvent(e);
      if (!cell) {
        return;
      }

      if (options.cancelEditOnDrag && _grid.getEditorLock().isActive()) {
        _grid.getEditorLock().cancelCurrentEdit();
      }

      if (_grid.getEditorLock().isActive() || !/move|selectAndMove/.test(_grid.getColumns()[cell.cell].behavior)) {
        return;
      }

      _dragging = true;
      e.stopImmediatePropagation();

      var selectedRows = _grid.getSelectedRows();

      if (selectedRows.length === 0 || $.inArray(cell.row, selectedRows) === -1) {
        selectedRows = [cell.row];
        _grid.setSelectedRows(selectedRows);
      }

      var rowHeight = _grid.getOptions().rowHeight;

      dd.selectedRows = selectedRows;

      dd.selectionProxy = $("<div class='slick-reorder-proxy'/>")
          .css("position", "absolute")
          .css("zIndex", "99999")
          .css("width", $(_canvas).innerWidth())
          .css("height", rowHeight * selectedRows.length)
          .appendTo(_canvas);

      dd.guide = $("<div class='slick-reorder-guide'/>")
          .css("position", "absolute")
          .css("zIndex", "99998")
          .css("width", $(_canvas).innerWidth())
          .css("top", -1000)
          .appendTo(_canvas);

      dd.insertBefore = -1;
    }

    function handleDrag(e, dd) {
      if (!_dragging) {
        return;
      }

      e.stopImmediatePropagation();

      var top = e.pageY - $(_canvas).offset().top;
      dd.selectionProxy.css("top", top - 5);

      var insertBefore = Math.max(0, Math.min(Math.round(top / _grid.getOptions().rowHeight), _grid.getDataLength()));
      if (insertBefore !== dd.insertBefore) {
        var eventData = {
          rows: dd.selectedRows,
          insertBefore: insertBefore
        };

        if (_self.onBeforeMoveRows.notify(eventData) === false) {
          dd.guide.css("top", -1000);
          dd.canMove = false;
        } else {
          dd.guide.css("top", insertBefore * _grid.getOptions().rowHeight);
          dd.canMove = true;
        }

        dd.insertBefore = insertBefore;

        // TODO: Implement in a timer
        _grid.scrollRowIntoView(insertBefore);
      }
    }

    function handleDragEnd(e, dd) {
      if (!_dragging) {
        return;
      }
      _dragging = false;
      e.stopImmediatePropagation();

      dd.guide.remove();
      dd.selectionProxy.remove();

      if (dd.canMove) {
        var eventData = {
          rows: dd.selectedRows,
          insertBefore: dd.insertBefore
        };
        // TODO: _grid.remapCellCssClasses ?
        _self.onMoveRows.notify(eventData);
      }
    }

    $.extend(this, {
      "onBeforeMoveRows": new Slick.Event(),
      "onMoveRows": new Slick.Event(),

      "init": init,
      "destroy": destroy
    });
  }
})(jQuery);
