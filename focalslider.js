/**
 * FocalSlider v0.1
 * Author: Tim King
 */
var FocalSlider = (function () {

	/** @type {Image} 32x32 left arrow */
	var prevIcon = new Image(); prevIcon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA8UlEQVRYhd2X0QYCQRSG10pPkCRJz5QkXaQXSrJWkvREe5EkSdI7dLfyddFGRrszy5456WevZna/zxk7cyYIKg4QAhEwqPrbrvANr6TAWAvOh8TEF3zL9zyAqRb8nQSoacF3QEMKbq65mb0m/AA0teBHoCUFX1vgJ6AtBV/9MvwMdP4SvtSCB9rw2Ac8LBi7W96tZ49MsirMLFW4AT1piblF4upDYuEg0ZWWiCwSFx8SXv6MIgm9XbGkhMyhZEjYjmWZnsCQcGlMqu+KDAlbJWT6wpISCVC07YtK+Lmi5UikwEgcniORAkNvcEMiBvou85/zmmf/a5dcPQAAAABJRU5ErkJggg==';
	/** @type {Image} 32x32 right arrow */
	var nextIcon = new Image(); nextIcon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA7klEQVRYhe2X0QYCQRSGx0qXK0mPlGSlN1xJkqyeIF0mSZKeJRFfFy1t2m0OO2dmL/qvl++b3ePsP8YIAgyAFGhJnncaYATceGXlVQJIgDuf8SMBTErgfiQAA2wr4N4kYmAXWqIDHEJLdIGjRWLpQ+IUWqIHnJsgcbFILLQl+gKJeVMkotASs79EnmmVhAuzyBhjG7iHA8538tNfLadPVT5B3VdfFy5ZSDrDh2wl62xDQv6UhHCdboCsE6jBJa0o04LHwD4k3FZK10BbA26ATRB4QeLXxUQXXpAYl0hkXuAFiYT35VRn4AQSQ5R63hNnHGgduYs84gAAAABJRU5ErkJggg==';

	/**
	 * @enum {string}
	 */
	var FocalPoint = {
		'TOP_LEFT': 0,
		'TOP_MIDDLEe': 1,
		'TOP_RIGHT': 2,
		'MIDDLE_LEFT': 3,
		'MIDDLE': 4,
		'MIDDLE_RIGHT': 5,
		'BOTTOM_LEFT': 6,
		'BOTTOM_MIDDLE': 7,
		'BOTTOM_RIGHT': 8
	};

	/** Cross browse compatibility for requestAnimationFrame */
	var requestAnimFrame = (function (callback) {
		return window.requestAnimationFrame || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame || 
			window.oRequestAnimationFrame || 
			window.msRequestAnimationFrame ||
			function(callback) {
				window.setTimeout(callback, 1000 / 60); // 60 FPS
			};
	})();

	/**
	 * A slide
	 * @param {Image} image  
	 * @param {number} focalPoint The focal point
	 */
	function Slide(image, focalPoint) {
		this.image = image;
		this.focalPoint = focalPoint;
		this.index = null;
		this.parent = null;
	}
	/** Show the slide on its parent slider */
	Slide.prototype.show = function () {
		this.parent.showSlide(this);
	};

	/**
	 * Create a new slider.
	 * @param {Object} options 				The slider configuration.
	 * @param {string} options.container 	Query string for the container.
	 * @param {Object[]} options.slides 	Slides containing a src and focus attributes.
	 * @param {string} [slideDuration=5000] Duration of each slide in ms when autoPlay is on.
	 * @param {boolean} [autoPlay=true]	Auto start the slide transitions. 			
	 */
	function Slider(options) {
		this.containerSelector = options.container;
		
		this.container = null;
		this.canvas = null;
		this.context = null;
		
		this.slides = [];
		this.currentSlideIndex = null;
		this.numSlides = 0;

		this.autoPlay = (options.autoPlay !== false);		// Default: true
		this.hideArrows = (options.hideArrows === true);	// Default: false
		this.slideDuration = (options.slideDuration || 5000);
		this.transitionPercent = 0;	// Percentage of slide transition animation completed

		this.createCanvas();
		if (options.slides && options.slides.length > 0) {
			this.loadSlides(options.slides);
		}
	}

	/**
	 * Add a slide. Sets the index and parent references on the slide.
	 * @param {Slide} slide 
	 */
	Slider.prototype.addSlide = function (slide) {
		this.slides.push(slide);
		this.numSlides = this.slides.length;
		slide.parent = this;
		slide.index = this.numSlides - 1;
	};

	/**
	 * Show a slide
	 * @param  {number|Slide} slide 	Either a slide or slide index.
	 */
	Slider.prototype.showSlide = function (slide) {
		var index;
		if (slide === undefined || slide === null) {
			index = this.currentSlideIndex;
			slide = this.slides[index];
		} else if (typeof slide === 'number') {
			index = slide;
			slide = this.slides[index];
		} else {
			index = slide.index;
		}
		this.drawImage(slide);
		this.currentSlideIndex = index;
	};

	/** Show the next slide with a fade animation */
	Slider.prototype.next = function () {
		var currentSlide = this.slides[this.currentSlideIndex];
		if (++this.currentSlideIndex === this.numSlides) {
			this.currentSlideIndex = 0;
		}
		var nextSlide = this.slides[this.currentSlideIndex];
		this.fadeTransition(currentSlide, nextSlide);
	};

	/** Show the previous slide with a fade animation */
	Slider.prototype.previous = function () {
		var currentSlide = this.slides[this.currentSlideIndex];
		if (--this.currentSlideIndex == -1) {
			this.currentSlideIndex = this.numSlides - 1;
		}
		var nextSlide = this.slides[this.currentSlideIndex];
		this.fadeTransition(currentSlide, nextSlide);
	};

	/**
	 * Start the slideshow.
	 * @param {number} [interval] The interval in ms. If not supplied the last used timer is used. (Default: 5000ms).
	 */
	Slider.prototype.start = function (interval) {
		if (typeof interval !== 'number') {
			interval = this.slideDuration;
		} else {
			this.slideDuration = interval;
		}
		this.stop(); // Clear any existing timer
		this.timer = setInterval(this.next.bind(this), interval);
	};

	/** Stop the slideshow */
	Slider.prototype.stop = function () {
		if (typeof this.timer !== 'undefined') {
			clearInterval(this.timer);
			delete this.timer;
		}
	};

	/** Restart the slideshow timer. E.g. after manual transition */
	Slider.prototype.restart = function() {
		this.stop();
		this.start();
	};
	
	/** Get the canvas for this slider */
	Slider.prototype.getCanvas = function () {
		return this.canvas;
	};

	/** Get the canvas 2d context */
	Slider.prototype.getContext = function () {
		if (!this.context) {
			this.context = this.canvas.getContext('2d');
		}
		return this.context;
	};

	/**
	 * Get the canvas dimensions
	 * @return {Object} Contains x and y properties
	 */
	Slider.prototype.getCanvasSize = function () {
		return { x: this.getCanvas().scrollWidth, y: this.getCanvas().scrollHeight };
	};

	/**
	 * Fade into the next slide
	 * @param  {Slide} currentSlide 
	 * @param  {Slide} nextSlide    
	 */
	Slider.prototype.fadeTransition = function (currentSlide, nextSlide) {
		if (this.transitionPercent > 100) {
			this.transitionPercent = 0;
			// Restart the timer if autoplay is on.
			if (this.timer !== undefined) {
				this.restart();
			}
			return;
		}
		requestAnimFrame(this.fadeTransition.bind(this, currentSlide, nextSlide));
		this.drawImage(nextSlide, this.transitionPercent / 100);
		this.drawImage(currentSlide, (1 - this.transitionPercent / 100));
		this.transitionPercent += 4;
	};

	/**
	 * Draw the image on the canvas. Image is scaled to fit canvas dimensions and moved so that
	 * the configured focal point is always visible.
	 * @param  {Slide} slide 
	 * @param {number} [opacity=1] Slide opacity used for transition.
	 */
	Slider.prototype.drawImage = function (slide, opacity) {
		if (opacity === undefined) {
			opacity = 1;
		}
		// Calculate image & canvas ratios
		var imageWidth = slide.image.width, 
			imageHeight = slide.image.height,
			imageRatio = imageWidth / imageHeight;

		var canvasSize = this.getCanvasSize(),
			canvasWidth = canvasSize.x,
			canvasHeight = canvasSize.y,
			canvasRatio = canvasWidth / canvasHeight;

		// Scale image to fill canvas with no white space. 
		// One of the display dimensions will be larger than the canvas
		var displayWidth, displayHeight; // Scaled image dimensions
		if (canvasRatio < imageRatio) {
			displayWidth = imageWidth * canvasHeight / imageHeight;
			displayHeight = canvasHeight;
		} else {
			displayWidth = canvasWidth;
			displayHeight = imageHeight * canvasWidth / imageWidth;
		}

		// Move the image so its focal point is always visible
		var x = 0, y = 0; // Placement of the top left corner of image. 0,0 is top left of canvas

		// Move X
		switch (slide.focalPoint) {
			case FocalPoint.TOP_RIGHT:
			case FocalPoint.MIDDLE_RIGHT:
			case FocalPoint.BOTTOM_RIGHT:
				if (displayWidth > canvasWidth) {
					x = canvasWidth - displayWidth;
				}
				break;
			case FocalPoint.TOP_MIDDLE:
			case FocalPoint.MIDDLE:
			case FocalPoint.BOTTOM_MIDDLE:
				if (displayWidth > canvasWidth) {
					x = (canvasWidth - displayWidth)/2;
				}
				break;
		}
		// Move Y
		switch (slide.focalPoint) {
			case FocalPoint.BOTTOM_LEFT:
			case FocalPoint.BOTTOM_MIDDLE:
			case FocalPoint.BOTTOM_RIGHT:
				if (displayHeight > canvasHeight) {
					y = canvasHeight - displayHeight;
				}
				break;
			case FocalPoint.MIDDLE_LEFT:
			case FocalPoint.MIDDLE:
			case FocalPoint.MIDDLE_RIGHT:
				if (displayHeight > canvasHeight) {
					y = (canvasHeight - displayHeight)/2;
				}
				break;
		}
		// Draw the iamge on the slider
		var ctx = this.getContext();
		ctx.globalAlpha = opacity;
		ctx.drawImage(slide.image, x, y, displayWidth, displayHeight);
		
		if (!hideIcons) {
			drawIcons(ctx, canvasSize);
		}
	};

	/**
	 * Draw icons for next and previous navigation
	 * @param {CanvasRenderingContext2D} ctx
	 */
	function drawIcons(ctx, canvasSize) {
		ctx.save();
		ctx.globalAlpha = 0.8;
		ctx.drawImage(prevIcon, 0, canvasSize.y/2 - 16); // Icons are 32x32
		ctx.drawImage(nextIcon, canvasSize.x - 32, canvasSize.y/2 - 16);
		ctx.restore();
	}

	/**
	 * Create the canvas inside the element returned by the given selector.
	 * @param  {string} containerSelector A valid query string
	 */
	Slider.prototype.createCanvas = function (containerSelector) {
		// TODO validate container selector
		// Throw exceptions on problems
		if (!containerSelector) {
			containerSelector = this.containerSelector;
		} else {
			this.containerSelector = containerSelector;
		}
		this.container = document.querySelector(containerSelector);
		this.canvas = document.createElement('canvas');
		this.setCanvasSize();
		this.container.appendChild(this.canvas);

		this.addEventListeners();
	};

	/** Add event handlers for focus/blur, resize and click events */
	Slider.prototype.addEventListeners = function () {
		var self = this;
		// Resize event handler
		window.addEventListener('resize', function () { self.resize(); }, false);

		// Pause and play slides on blur and focus
		window.addEventListener('blur', function () {
			if (typeof self.timer !== 'undefined') {
				self.resumeTimer = true;
				self.stop();
			}
		});
		window.addEventListener('focus', function() {
			if (self.resumeTimer === true) {
				delete self.resumeTimer;
				self.start();
			}
		});

		// Click hander for forward / back navigation
		this.canvas.addEventListener('click', function (event) { 
			// Only navigate if there is no existing animation in progress
			if (self.transitionPercent === 0) {
				var pos = getCursorPosition(self.canvas, event); 
				var size = self.getCanvasSize();
				// Navigate if clicking on the left or right of the image
				if (pos.x > 0 && pos.x < 64) {
					self.previous();
				} else if (pos.x > (size.x - 64) && pos.x < size.x) {
					self.next();
				}
			}
		});
	};

	/**
	 * Get the coordinates of a click event that occured on the canvas.
	 * @param  {HTMLElement} canvas
	 * @param  {event} event  
	 * @return {Object}        Contains x and y properties. Origin is top left.
	 */
	function getCursorPosition(canvas, event) {
		var rect = canvas.getBoundingClientRect();
		var x = event.clientX - rect.left;
		var y = event.clientY - rect.top;
		return { x: x, y: y };
	}

	/** Set the canvas size to fill its container */
	Slider.prototype.setCanvasSize = function () {
		this.canvas.width = this.container.clientWidth;
		this.canvas.height = this.container.clientHeight;
	};

	/** window resize event handler. Resizes and redraws the canvas */
	Slider.prototype.resize = function () {
		this.setCanvasSize();
		// Don't redraw during transition -- the transition will dedraw.	
		if (this.transitionPercent === 0) {
			this.drawImage(this.slides[this.currentSlideIndex]);
		}
	};

	/**
	 * Asynchronously preload slides in sequence and add to slider. 
	 * When the first slide is loaded it is displayed automatically.
	 * @param  {Array<Object>} slides
	 * @param {number} [i=0] The index in the first parameter to load.
	 */
	Slider.prototype.loadSlides = function (slides, i) {
		if (i === undefined) {
			i = 0;
		}

		/** Load the next slide -- invoked from load/error handlers */
		var self = this;
		function loadNext() {
			if (i < slides.length-1) {
				self.loadSlides(slides, ++i);
			}
		}

		var img = new Image();
		img.onload = function () {
			var focalPoint = slides[i].focus.toUpperCase().replace('-', '_'); // top-left -> TOP_LEFT
			var slide = new Slide(img, FocalPoint[focalPoint]);
			self.addSlide(slide);

			// If this is the first image, show it 
			if (i === 0) {
				slide.show();
				if (self.autoPlay) { 
					self.start(); 
				}
			}

			// Load the next slide
			loadNext();
		};
		img.onerror = function () {
			console.error('Unable to load image ' + i + ' src: ' + slides[i].src);
			loadNext();
		};
		img.src = slides[i].src;
	};

	return Slider;
})();