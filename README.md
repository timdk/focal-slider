# Focal Slider

Focal Slider is an image slideshow using `<canvas>` that allows you to set a focal point on each slide so when the image is scaled to fill its container, the most important part is always visible.

## Usage

Create a container element.

```html
<div id="slider"></div>
```

Initialise the slider.

```javascript
var slider = new FocalSlider({
	container: '#slider',	// Any valid queryString
	hideArrows: false,		// Default: false
	autoPlay: false,		// Default: true
	slideDuration: 4000,	// Milliseconds. Default: 5000
	slides: [ 
		{	src: 'images/keas.jpg', 	focus: 'bottom-left'	}, 
		{	src: 'images/tiki.jpg', 	focus: 'top-middle'		}, 
		{	src: 'images/jetboat.jpg', 	focus: 'middle-right'	}, 
		{	src: 'images/library.jpg', 	focus: 'top-left'		}, 
		{	src: 'images/paraski.jpg', 	focus: 'middle' 		}, 
		{	src: 'images/ski.jpg', 		focus: 'top-left'		} 
	]
});
```

### Focal Points
There are 9 focal points to choose from.

| Left        | Middle        | Right        |
| ----------- | :-----------: | -----------: |
| top-left    | top-middle    | top-right    |
| middle-left | middle        | middle-right |
| bottom-left | bottom-middle | bottom-right |

## Demo

View an active demo on the homepage of [Louis Trerise Photography](http://louistrerise.com).
