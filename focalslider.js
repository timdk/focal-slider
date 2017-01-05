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
		'TOP_MIDDLE': 1,
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

	/** Set the name of the hidden property and the change event for visibility */
	var hidden, visibilityChange; 
	if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
		hidden = "hidden";
		visibilityChange = "visibilitychange";
	} else if (typeof document.msHidden !== "undefined") {
		hidden = "msHidden";
		visibilityChange = "msvisibilitychange";
	} else if (typeof document.webkitHidden !== "undefined") {
		hidden = "webkitHidden";
		visibilityChange = "webkitvisibilitychange";
	}

	/** CustomEvent Polyfill */
	(function () {
		if ( typeof window.CustomEvent === "function" ) return false;

		function CustomEvent ( event, params ) {
			params = params || { bubbles: false, cancelable: false, detail: undefined };
			var evt = document.createEvent( 'CustomEvent' );
			evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
			return evt;
		}

		CustomEvent.prototype = window.Event.prototype;

		window.CustomEvent = CustomEvent;
	})();

	/**
	 * A slide
	 * @param {Image} image  
	 * @param {number} focalPoint The focal point
	 */
	function Slide(src, focalPoint, parentSlider, index) {
		this.src = src;
		this.focalPoint = FocalPoint[focalPoint.toUpperCase().replace('-', '_')]; // top-left -> TOP_LEFT
		this.parent = parentSlider;
		this.index = index;
		
		this.image = new Image();
		this.loaded = false;
	}

	/**
	 * Load the slide
	 * @param  {Function} callback      
	 * @param  {Function}   errorCallback 
	 */
	Slide.prototype.load = function (callback, errorCallback) {
		var self = this;
		this.image.onload = function () {
			self.loaded = true;
			if (typeof callback === 'function') {
				callback(self);
			}
		};
		this.image.onerror = function () {
			console.error('Unable to load image ' + i + ' src: ' + slides[i].src);
			if (typeof errorCallback === 'function') {
				errorCallback(self);
			}
		};
		this.image.src = this.src;
	};

	/** Show the slide on its parent slider */
	Slide.prototype.show = function () {
		if (this.loaded) {
			this.parent.showSlide(this);
		} else {
			var self = this;
			this.load(function () { self.parent.showSlide(this); });
		}
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
		this.currentSlideIndex = -1;
		this.numSlides = 0;

		this.autoPlay = (options.autoPlay !== false);		// Default: true
		this.hideArrows = (options.hideArrows === true);	// Default: false
		this.slideDuration = (options.slideDuration || 5000);
		this.transitionInProgress = false;

		this.createCanvas();
		if (options.slides && options.slides.length > 0) {
			this.loadSlides(options.slides);
		}
	}

	/**
	 * Add a slide. Sets the index and parent references on the slide.
	 * @param {Slide} slide 
	 */
	Slider.prototype.addSlide = function (src, focalPoint) {
		this.numSlides = this.slides.push(new Slide(src, focalPoint, this, this.slides.length));
	};

	/**
	 * Remove a slide from the.
	 * @param  {number} index The index of the slide to remove
	 */
	Slider.prototype.removeSlide = function (index) {
		if (typeof this.slides[index] !== 'undefined') {
			this.slides.splice(index, 1);
			for (; index < this.slides.length; index++) {
				this.slides[index].index = index;
			}
		}
	};

	/**
	 * Asynchronously preload slides in sequence and add to slider. 
	 * When the first slide is loaded it is displayed automatically.
	 * @param  {Array<Object>} slides Options from configuration JSON.
	 */
	Slider.prototype.loadSlides = function (slides) {
		for (i = 0; i < slides.length; i++) {
			this.addSlide(slides[i].src, slides[i].focus);
		}

		this.waiting = true; // Shows slide when loaded
		var self = this;
		var slideLoaded = function (slide) {
			var event = new CustomEvent('slideloaded', { detail: slide });
			self.getCanvas().dispatchEvent(event);

			// Load next slide;
			if (slide.index < self.numSlides - 1) {
				self.slides[slide.index+1].load(slideLoaded);
			}
		};
		this.slides[0].load(slideLoaded);

		if (this.autoPlay) {
			this.start();
		}
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

		// transition to new slide
		if (this.currentSlideIndex !== -1) {
			var currentSlide = this.slides[this.currentSlideIndex];
			var self = this;
			this.transitionInProgress = true;
			fadeTransition(this, currentSlide, slide, 0, function () {
				// Restart the timer if autoplay is on.
				self.transitionInProgress = false;
				self.currentSlideIndex = index;
				if (self.timer !== undefined) {
					self.restart();
				}
			});
		} else {
			this.drawImage(slide);
			this.currentSlideIndex = index;
		}
	};

	/**
	 * Fade into the next slide
	 * @param {slider} Slider 
	 * @param  {Slide} currentSlide 
	 * @param  {Slide} nextSlide
	 * @param {transitionPercent} number Percentage of transition completed
	 * @param {callback} Function Executed when transition is complete    
	 */
	function fadeTransition(slider, currentSlide, nextSlide, transitionPercent, callback) {
		if (transitionPercent > 100) {
			if (typeof callback === 'function') {
				callback();
			}
			return;
		}
		slider.drawImage(nextSlide, transitionPercent / 100);
		slider.drawImage(currentSlide, (1 - transitionPercent / 100));
		transitionPercent += 4;
		requestAnimFrame(function () { fadeTransition(slider, currentSlide, nextSlide, transitionPercent, callback); });
	}

	/** Show the next slide with a fade animation */
	Slider.prototype.next = function () {
		var nextSlideIndex = this.currentSlideIndex+1;
		if (nextSlideIndex === this.numSlides) {
			nextSlideIndex = 0;
		}
		var nextSlide = this.slides[nextSlideIndex];
		
		if (nextSlide.loaded) {
			this.showSlide(nextSlide);
		} else {
			this.waiting = true; // slide loaded event handler will display it
		}
	};

	/** Show the previous slide with a fade animation */
	Slider.prototype.previous = function () {
		var nextSlideIndex = this.currentSlideIndex - 1;
		if (nextSlideIndex === -1) {
			nextSlideIndex = this.numSlides - 1;
		}
		var nextSlide = this.slides[nextSlideIndex];
		
		if (nextSlide.loaded) {
			this.showSlide(nextSlide);
		} else {
			this.waiting = true; // slide loaded event handler will display it
		}
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
		
		if (!this.hideIcons) {
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

		// Pause and play slides on vsibility change
		document.addEventListener(visibilityChange, function () {
			if (document[hidden]) {
				if (typeof self.timer !== 'undefined') {
					self.resumeTimer = true;
					self.stop();
				}
			} else {
				if (self.resumeTimer === true) {
					delete self.resumeTimer;
					self.start();
				}
			}
		}, false);

		// Click hander for forward / back navigation
		this.canvas.addEventListener('click', function (event) { 
			// Only navigate if there is no existing animation in progress
			if (!self.transitionInProgress) {
				var pos = getCursorPosition(self.canvas, event); 
				var size = self.getCanvasSize();
				// Navigate if clicking on the left or right of the image
				if (pos.x > 0 && pos.x < 64) {
					self.previous();
				} else if (pos.x > (size.x - 64) && pos.x < size.x) {
					self.next();
				}
			}
		}, false);

		// If waiting for next slide to load to display it, show it when it's ready
		this.canvas.addEventListener('slideloaded', function (event) {
			if (self.waiting) {
				self.waiting = false;
				self.showSlide(event.detail);
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
		if (!this.transitionInProgress) {
			this.drawImage(this.slides[this.currentSlideIndex]);
		}
	};

	return Slider;
})();
