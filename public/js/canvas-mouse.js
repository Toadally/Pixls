/*!
	canvas-mouse 0.6.0 alpha
	Copyright (c) 2017 Epistemex
	MIT license.
*/

;"use strict";

/**
 * A mouse and touch position handler for 2D canvas able to handle scaled
 * and transformed context and element.
 *
 * @param {CanvasRenderingContext2D} context - 2D context to bind to this instance
 * @param {CanvasMouseOptions} [options] - optional options object to allow for scale and transforms to be considered.
 * @constructor
 */
function CanvasMouse(context, options) {

  if (!(context instanceof CanvasRenderingContext2D))
    throw "Need a 2D canvas context.";

  options = Object.assign({
    handleScale: false,
    handleTransforms: false,
    matrix: null
  }, options);

  var
    me = this,
    defProp = Object.defineProperty.bind(Object),
    ref,
    hasCurrentTransform = ("currentTransform" in context || "mozCurrentTransform" in context),
    deltaX,
    deltaY,
    scaleX,
    scaleY,
    paddingBorderLeft,
    paddingBorderTop,
    canvas = context.canvas,
    matrix = options.matrix,
    imatrix = matrix ? matrix.inverse() : null,
    doScale = options.handleScale,
    doTransforms = options.handleTransforms && (hasCurrentTransform || matrix),
    transform = matrix ? _transforms2 : _transforms;

  /*--------------------------------------------------------------------

      INTERNALS

  --------------------------------------------------------------------*/

  if (doTransforms && !hasCurrentTransform && !matrix) {
    console.log("Browser doesn't support currentTransform.");
    doTransforms = false;
  }

  // optimize inverse matrix extraction
  function patchMatrix() {
    if (matrix && !matrix._xx) {
      matrix._xx = matrix._x;
      matrix._x = function() {
        imatrix = this.inverse();
        return this._xx();
      }
    }
  }

  // Limit reflow so only read trigger values when absolutely needed
  function init() {
    var
      rect = canvas.getBoundingClientRect(),
      cs = getComputedStyle(canvas),
      prop = cs.getPropertyValue.bind(cs),
      pInt = parseInt,
      _p = "padding-", _b = "border-", _w = "-width",
      L = "left", R = "right", T = "top", B = "bottom";

    paddingBorderLeft = pInt(prop(_p + L)) + pInt(prop(_b + L + _w));
    paddingBorderTop = pInt(prop(_p + T)) + pInt(prop(_b + T + _w));
    deltaX = rect.left + paddingBorderLeft;
    deltaY = rect.top + paddingBorderTop;
    scaleX = (canvas.width / (rect.width - (paddingBorderLeft + pInt(prop(_p + R)) + pInt(prop(_b + R + _w))))) || 1;
    scaleY = (canvas.height / (rect.height - (paddingBorderTop + pInt(prop(_p + B)) + pInt(prop(_b + B + _w))))) || 1;
  }

  // debounce updates
  function _handler() {
    cancelAnimationFrame(ref);
    ref = requestAnimationFrame(_updateOnScroll)
  }

  function _updateOnScroll() {
    var rect = canvas.getBoundingClientRect();
    deltaX = rect.left + paddingBorderLeft;
    deltaY = rect.top + paddingBorderTop;
  }

  /*--------------------------------------------------------------------

      POINT CONVERTERS

  --------------------------------------------------------------------*/

  // Always called - converts event to relative position
  function _basic(e) {
    return {
      x: e.clientX - deltaX,
      y: e.clientY - deltaY
    }
  }

  // Scales the point (if enabled)
  function _scale(pos) {
    pos.x *= scaleX;
    pos.y *= scaleY;
    return pos
  }

  // Transforms the point (if enabled) using the browsers' DOMMatrix
  function _transforms(pos) {
    var
      currentMatrix = (context.currentTransform || context.mozCurrentTransform),
      matrix,
      imatrix;

    // Convert from SVGMatrix (used by Chrome in experimental mode)
    if (currentMatrix instanceof SVGMatrix) currentMatrix = DOMMatrix.fromMatrix(currentMatrix);

    // Firefox returns Array instead of DOMMatrix..
    matrix = typeof currentMatrix.a === "undefined" ? new DOMMatrix(currentMatrix) : currentMatrix;

    // Eventually, get inverse matrix
    imatrix = matrix.invertSelf();

    return {
      x: pos.x * imatrix.a + pos.y * imatrix.c + imatrix.e,
      y: pos.x * imatrix.b + pos.y * imatrix.d + imatrix.f
    }
  }

  // Transforms the point (if enabled) using the custom Matrix object
  function _transforms2(pos) {
    return imatrix.applyToPoint(pos.x, pos.y);
  }

  /*--------------------------------------------------------------------

      PUBLIC METHODS

  --------------------------------------------------------------------*/

  /**
   * Function to convert mouse or touch position to match the context
   * and its element scale and transforms.
   *
   * @param {*} event - event object (mouse, touch) to use for conversion
   * @returns {Point}
   */
  this.getPos = function(event) {
    var pos = _basic(event);
    if (doScale) pos = _scale(pos);
    if (doTransforms) pos = transform(pos);
    return pos
  };

  /**
   * Pass in custom x and y point to convert to new position relative to
   * bound context. The way it's calculated depends on the options set
   * when creating the instance.
   *
   * The method can take both a Point object, or two numbers.
   *
   * @param {number|Point} x - x position to convert, or if Point the x and y of the object.
   * @param {number} [y] - y position to convert (not used if Point object is provided).
   * @returns {Point}
   */
  this.getPosXY = function(x, y) {
    var _x; // to allow optimization (always a number)
    if (arguments.length === 1) {
      y = x.y;
      _x = x.x;
    }
    else _x = x;

    return me.getPos({
      clientX: _x / scaleX + deltaX,
      clientY: y / scaleY + deltaY
    })
  };

  /**
   * Force re-initialization. Use if canvas element have either border, padding
   * or size changed.
   * @method
   */
  this.init = init;

  /**
   * Used to manually update relative position in client if not caught
   * automatically by internals (scroll and resize).
   * @method
   */
  this.update = _updateOnScroll;

  /*--------------------------------------------------------------------

      PUBLIC PROPERTIES

  --------------------------------------------------------------------*/

  /**
   * Set or get handleScale status. Can be toggled at any time and will
   * affect next position calculations.
   * @member {boolean} CanvasMouse#handleScale
   */
  defProp(me, "handleScale", {
    get: function() {return doScale},
    set: function(state) {doScale = !!state}
  });

  /**
   * Set or get handleTransforms status. Can be toggled at any time and will
   * affect next position calculations. **Note** that if the browser does not
   * support currentTransform and a custom Matrix is not provided the flag
   * will be set to false regardless.
   * @member {boolean} CanvasMouse#handleTransforms
   */
  defProp(me, "handleTransforms", {
    get: function() {return doTransforms},
    set: function(state) {
      doTransforms = !!state && (hasCurrentTransform || matrix);
    }
  });

  /**
   * Set or get custom matrix object. If set will override and patch the
   * provided matrix.
   * @member {Matrix} CanvasMouse#matrix
   */
  defProp(me, "matrix", {
    get: function() {return matrix},
    set: function(newMatrix) {
      matrix = newMatrix;
      doTransforms = doTransforms && (hasCurrentTransform || matrix);
      patchMatrix();
    }
  });

  /*--------------------------------------------------------------------

      INITIALIZE INSTANCE

  --------------------------------------------------------------------*/

  patchMatrix();
  init();

  window.addEventListener("scroll", _handler);
  window.addEventListener("resize", _handler);
}

/**
 * Valid properties for the option object passed to CanvasMouse constructor.
 * The object is intended to be an literal object.
 *
 * The default settings handle padding and borders.
 *
 * @name CanvasMouseOptions
 * @prop {boolean} [handleScale=false] - handles situations where element size is different than the bitmap size.
 * @prop {boolean} [handleTransforms=false] - consider transforms applied to the context when calculating position.
 *  Note that this require either `currentTransform` support on the context,
 *  or the use of a custom Matrix solution (github.com/epistemex/transformation-matrix-js).
 * @prop {Matrix} [matrix=null] - to support broader range of browser a custom matrix object can be passed already bound
 *  to the current context (same as passed as argument). Using a custom matrix will require the transforms to be called on this
 *  instead of the context itself.
 */

/**
 * Point object
 * @name Point
 * @prop {number} x - floating point number for x position
 * @prop {number} y - floating point number for y position
 */
