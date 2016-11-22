/**
 * AnchorSlider v0.1
 * Author: Tim King
 */
var AnchorSlider = (function () {
	var anchorSlider = {};

	var _containerSelector;
	var _container;
	var _canvas;
	var _context;

	var _slides = [];

	/**
	 * @enum {string}
	 */
	var Anchor = {
		'top_left': 0,
		'top_middle': 1,
		'top_right': 2,
		'middle_left': 3,
		'middle': 4,
		'middle_right': 5,
		'BOTTOM_LEFT': 6,
		'bottom_middle': 7,
		'bottom_right': 8
	};

	/**
	 * A slider slide
	 * @param {Image} image  
	 * @param {number} anchor The anchor point
	 */
	function Slide(image, anchor) {
		this.image = image;
		this.anchor = anchor;
	}
	Slide.prototype.show = function () {
		drawImage(this);
	};

	/** Get the canvas 2d context */
	function getContext() {
		if (!_context) {
			_context = _canvas.getContext('2d');
		}
		return _context;
	}

	function getCanvas() {
		return document.querySelector(_containerSelector + ' canvas');
	}

	/**
	 * Get the canvas dimensions
	 * @return {Object} Contains x and y properties
	 */
	function getCanvasSize() {
		return { x: _canvas.scrollWidth, y: _canvas.scrollHeight };
	}


	function drawImage(slide) {
		var x = 0, y = 0; // Placement of the top left corner of image. 0,0 is top left of canvas

		var imageWidth = slide.image.width, imageHeight = slide.image.height;
		var imageRatio = imageWidth / imageHeight;

		var canvasSize = getCanvasSize();
		var canvasWidth = canvasSize.x, canvasHeight = canvasSize.y;
		var canvasRatio = canvasWidth / canvasHeight;

		var displayWidth, displayHeight; // Scaled image dimensions
		// Scale image to fill canvas with no white space
		if (canvasRatio < imageRatio) {
			displayWidth = imageWidth * canvasHeight / imageHeight;
			displayHeight = canvasHeight;
		} else {
			displayWidth = canvasWidth;
			displayHeight = imageHeight * canvasWidth / imageWidth;
		}

		// Move the image so its anchor point is always visible
		switch (slide.anchor) {
			case Anchor.BOTTOM_LEFT:
				// if imageHeight is > canvasHeight, reduce y
				if (displayHeight > canvasHeight) {
					y = canvasHeight - displayHeight;
				}
				break;
		}

		getContext().drawImage(slide.image, x, y, displayWidth, displayHeight);
	}

	/**
	 * Create the canvas inside the element returned by the given selector.
	 * @param  {string} containerSelector A valid query string
	 */
	function createCanvas(containerSelector) {
		// TODO validate container selector
		// Throw exceptions on problems
		_containerSelector = containerSelector;
		_container = document.querySelector(containerSelector);
		_canvas = document.createElement('canvas');
		_container.appendChild(_canvas);
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas, false);
	}

	function resizeCanvas() {
		console.log('resizing canvas');
		getCanvas().setAttribute('width', _container.scrollWidth);
		_canvas.height = _container.scrollHeight;
	}

	/**
	 * Preload slides sequentially. When the first slide is 
	 * loaded it is displayed automatically
	 * @param  {Array<Object>} slides
	 */
	function loadSlides(slides) {
		createSlides(slides);
	}

	function createSlides(slides, i) {
		if (i === undefined) {
			i = 0;
		}
		// console.log('Loading slide ' + i);
		var img = new Image();
		img.onload = function () {
			//console.log('Slide ' + i + ' loaded');
			var slide = new Slide(img, Anchor[slides[i].anchor]);
			_slides.push(slide);

			// If this is the first image, show it 
			if (i === 0) {
				slide.show();
			}

			// Load the next slide
			if (i < slides.length-1) {
				createSlides(slides, ++i);
			}
		};
		img.src = slides[i].src;
	}

	anchorSlider.init = function (options) {
		// Create the canvas inside the container.
		try {
			createCanvas(options.container);
		} catch (e) {
			console.log(e);
			console.error('Error creating canvas - check configuration. Container: ' + options.container);
			return;
		}

		loadSlides(options.slides);
	};


	return anchorSlider;
})();