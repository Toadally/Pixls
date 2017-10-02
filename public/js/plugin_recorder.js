/*!
	Recorder plugin for Canvas Mouse ver 0.1.0-alpha
	Copyright (c) 2017 Epistemex
	www.epistemex.com
*/

/**
 * Recorder plugin for Canvas Mouse.
 *
 * Records original points based on events and converted points (original
 * points can be recalculated in case matrix for context changes).
 *
 * @constructor
 */
function CMRecorder() {
  var
    lastPos,
    lastEvent,
    recording = false,
    strokesOrg = [],
    strokes = [],
    strokeOrg,
    stroke;

  /*--------------------------------------------------------------------

      THE ONLY REQUIRED METHOD FOR ALL PLUGINS

  --------------------------------------------------------------------*/

  /**
   * Mandatory handler called internally by Canvas Mouse's `getPos()`.
   * Should never be called manually.
   *
   * @param {*} event - the original mouse/touch event (ignored in this plugin)
   * @param {Point} pos - point object with converted position
   * @returns {Point}
   */
  this.handler = function(event, pos) {
    lastPos = pos;
    lastEvent = {x: event.clientX, y: event.clientY, timeStamp: event.timeStamp};
    if (recording) {
      strokeOrg.push({x: event.clientX, y: event.clientY, timeStamp: event.timeStamp});
      stroke.push(pos);
    }
    return pos
  };

  /*--------------------------------------------------------------------

      THE FOLLOWING METHODS ARE SPECIFIC TO THIS PLUGIN

  --------------------------------------------------------------------*/

  /**
   * Start recording points and event.
   */
  this.start = function() {
    if (!recording) {
      recording = true;
      strokeOrg = [lastEvent];
      stroke = [lastPos];
    }
  };

  /**
   * Stop recording points and events.
   */
  this.stop = function() {
    if (recording) {
      recording = false;
      if (strokeOrg.length) strokesOrg.push(strokeOrg);
      if (stroke.length) strokes.push(stroke);
    }
  };

  /**
   * Clear all recorded points and events.
   */
  this.clear = function() {
    strokesOrg = [];
    strokes = [];
    stroke = strokeOrg = null;
  };

  /**
   * Recalculate original events into new points based on the current
   * state of the provided CanvasMouse instance.
   *
   * Note: Replaces all old points.
   *
   * @param {CanvasMouse} cm - Canvas Mouse instance to use
   * @returns {Array} - The recalculated strokes array
   */
  this.recalc = function(cm) {
    strokes = [];
    strokesOrg.forEach(function(strokeOrg) {
      var stroke = [];
      strokeOrg.forEach(function(pos) {
        var newPos = cm.getPos({clientX: pos.x, clientY: pos.y, timeStamp: pos.timeStamp});
        newPos.timeStamp = pos.timeStamp;
        stroke.push(newPos);
      });
      strokes.push(stroke);
    });
    return strokes
  };

  /**
   * Get recorded and converted strokes array. The array stores stroke
   * The array contains arrays representing strokes. Each stroke array
   * contains point objects. Each stroke array is intended to be a
   * continuous stroke.
   * @returns {Array}
   */
  this.strokes = function() {
    return strokes
  };

  /**
   * Returns non-calculated points based on the original event objects.
   * The array contains arrays representing strokes. Each stroke array
   * contains point objects. Each stroke array is intended to be a
   * continuous stroke.
   * @returns {Array}
   */
  this.originalStrokes = function() {
    return strokesOrg
  };
}
