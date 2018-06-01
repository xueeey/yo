/**
 * Copyright (C) 2011 Hakim El Hattab, http://hakim.se
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Reveal.js is an easy to use HTML based slideshow enhanced by 
 * sexy CSS 3D transforms.
 * 
 * Slides are given unique hash based URL's so that they can be 
 * opened directly.
 * 
 * Public facing methods:
 * - Reveal.initialize( { ... options ... } );
 * - Reveal.navigateTo( indexh, indexv );
 * - Reveal.navigateLeft();
 * - Reveal.navigateRight();
 * - Reveal.navigateUp();
 * - Reveal.navigateDown();
 * 
 * 
 * version 0.1:
 * - First release
 * 
 * version 0.2:    
 * - Refactored code and added inline documentation
 * - Slides now have unique URL's
 * - A basic API to invoke navigation was added
 * 
 * version 0.3:    
 * - Added licensing terms
 * - Fixed broken links on touch devices
 * 
 * version 1.0:
 * - Added controls
 * - Added initialization options
 * - Reveal views in fragments
 * - Revamped, darker, theme
 * - Tweaked markup styles (a, em, strong, b, i, blockquote, q, pre, ul, ol)
 * - Support for themes at initialization (default/linear/concave)
 * - Code highlighting via highlight.js
 * 
 * TODO:
 * - Touch/swipe interactions
 * - Presentation overview via keyboard shortcut
 *   
 * @author Hakim El Hattab | http://hakim.se
 * @version 1.0
 */
var Reveal = (function(){
  
  var HORIZONTAL_SLIDES_SELECTOR = '#quickpreso-canvas>section',
    VERTICAL_SLIDES_SELECTOR = 'section.present>section',

    indexh = 0,
    indexv = 0,

    config = {},
    dom = {};
  
  /**
   * Activates the main program logic.
   */
  function initialize( options ) {
    // Gather references to DOM elements
    dom.controls = document.querySelector( '#quickpreso-content-controls' );
    dom.controlsLeft = document.querySelector( '#quickpreso-content-controls .left' );
    dom.controlsRight = document.querySelector( '#quickpreso-content-controls .right' );
    dom.controlsUp = document.querySelector( '#quickpreso-content-controls .up' );
    dom.controlsDown = document.querySelector( '#quickpreso-content-controls .down' );

    // Add event listeners
    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('touchstart', onDocumentTouchStart, false);
    window.addEventListener('hashchange', onWindowHashChange, false);
    dom.controlsLeft.addEventListener('click', preventAndForward( navigateLeft ), false);
    dom.controlsRight.addEventListener('click', preventAndForward( navigateRight ), false);
    dom.controlsUp.addEventListener('click', preventAndForward( navigateUp ), false);
    dom.controlsDown.addEventListener('click', preventAndForward( navigateDown ), false);

    // Default options
    config.rollingLinks = options.rollingLinks === undefined ? true : options.rollingLinks;
    config.controls = options.controls === undefined ? false : options.controls;
    config.theme = options.theme === undefined ? 'default' : options.theme;

    if( config.controls ) {
      dom.controls.style.display = 'block';
    }

    if( config.theme !== 'default' ) {
      document.body.classList.add( config.theme );
    }

    if( config.rollingLinks ) {
      // Add some 3D magic to our anchors
      linkify();
    }

    // Read the initial hash
    readURL();
  }

  /**
   * Prevents an events defaults behavior calls the 
   * specified delegate.
   */
  function preventAndForward( delegate ) {
    return function( event ) {
      event.preventDefault();
      delegate.call();
    };
  }
  
  /**
   * Handler for the document level 'keydown' event.
   * 
   * @param {Object} event
   */
  function onDocumentKeyDown( event ) {
    
    if( event.keyCode >= 37 && event.keyCode <= 40 ) {
      
      switch( event.keyCode ) {
        case 37: navigateLeft(); break; // left
        case 39: navigateRight(); break; // right
        case 38: navigateUp(); break; // up
        case 40: navigateDown(); break; // down
      }
      
      slide();
      
      event.preventDefault();
      
    }
  }
  
  /**
   * Handler for the document level 'touchstart' event.
   * 
   * This enables very basic tap interaction for touch
   * devices. Added mainly for performance testing of 3D
   * transforms on iOS but was so happily surprised with
   * how smoothly it runs so I left it in here. Apple +1
   * 
   * @param {Object} event
   */
  function onDocumentTouchStart( event ) {
    // We're only interested in one point taps
    if (event.touches.length === 1) {
      // Never prevent taps on anchors and images
      if( event.target.tagName.toLowerCase() === 'a' || event.target.tagName.toLowerCase() === 'img' ) {
        return;
      }
      
      event.preventDefault();
      
      var point = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      
      // Define the extent of the areas that may be tapped
      // to navigate
      var wt = window.innerWidth * 0.3;
      var ht = window.innerHeight * 0.3;
      
      if( point.x < wt ) {
        navigateLeft();
      }
      else if( point.x > window.innerWidth - wt ) {
        navigateRight();
      }
      else if( point.y < ht ) {
        navigateUp();
      }
      else if( point.y > window.innerHeight - ht ) {
        navigateDown();
      }
      
      slide();
      
    }
  }
  
  
  /**
   * Handler for the window level 'hashchange' event.
   * 
   * @param {Object} event
   */
  function onWindowHashChange( event ) {
    readURL();
  }

  /**
   * Wrap all links in 3D goodness.
   */
  function linkify() {
    var supports3DTransforms =  document.body.style['webkitPerspective'] !== undefined || 
                                document.body.style['MozPerspective'] !== undefined ||
                                document.body.style['perspective'] !== undefined;

        if( supports3DTransforms ) {
          var nodes = document.querySelectorAll( 'section a:not(.image)' );

          for( var i = 0, len = nodes.length; i < len; i++ ) {
              var node = nodes[i];

              if( !node.className || !node.className.match( /roll/g ) ) {
                  node.className += ' roll';
                  node.innerHTML = '<span data-title="'+ node.text +'">' + node.innerHTML + '</span>';
              }
          }
        }
  }
  
  /**
   * Updates one dimension of slides by showing the slide
   * with the specified index.
   * 
   * @param {String} selector A CSS selector that will fetch
   * the group of slides we are working with
   * @param {Number} index The index of the slide that should be
   * shown
   * 
   * @return {Number} The index of the slide that is now shown,
   * might differ from the passed in index if it was out of 
   * bounds.
   */
  function updateSlides( selector, index ) {
    
    // Select all slides and convert the NodeList result to
    // an array
    var slides = Array.prototype.slice.call( document.querySelectorAll( selector ) );
    
    if( slides.length ) {
      // Enforce max and minimum index bounds
      index = Math.max(Math.min(index, slides.length - 1), 0);

      if (slides[index] === AJS.$('#quickpreso-canvas>section')[0]) {
        AJS.$('body').addClass('quickpreso-firstslide');
      } else {
        AJS.$('body').removeClass('quickpreso-firstslide');
      }
      
      slides[index].setAttribute('class', 'present');
      
      // Any element previous to index is given the 'past' class
      slides.slice(0, index).map(function(element){
        element.setAttribute('class', 'past');
      });
      
      // Any element subsequent to index is given the 'future' class
      slides.slice(index + 1).map(function(element){
        element.setAttribute('class', 'future');
      });
    }
    else {
      // Since there are no slides we can't be anywhere beyond the 
      // zeroth index
      index = 0;
    }
    
    return index;
    
  }
  
  /**
   * Updates the visual slides to represent the currently
   * set indices. 
   */
  function slide() {
    indexh = updateSlides( HORIZONTAL_SLIDES_SELECTOR, indexh );
    indexv = updateSlides( VERTICAL_SLIDES_SELECTOR, indexv );

    updateControls();
    
    writeURL();
  }

  /**
   * Updates the state and link pointers of the controls.
   */
  function updateControls() {
    var routes = availableRoutes();

    // Remove the 'enabled' class from all directions
    [ dom.controlsLeft, dom.controlsRight, dom.controlsUp, dom.controlsDown ].forEach( function( node ) {
      node.classList.remove( 'enabled' );
    } );

    if( routes.left ) dom.controlsLeft.classList.add( 'enabled' );
    if( routes.right ) dom.controlsRight.classList.add( 'enabled' );
    if( routes.up ) dom.controlsUp.classList.add( 'enabled' );
    if( routes.down ) dom.controlsDown.classList.add( 'enabled' );
  }

  /**
   * Determine what available routes there are for navigation.
   * 
   * @return {Object} containing four booleans: left/right/up/down
   */
  function availableRoutes() {
    var horizontalSlides = document.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR );
    var verticalSlides = document.querySelectorAll( VERTICAL_SLIDES_SELECTOR );

    return {
      left: indexh > 0,
      right: indexh < horizontalSlides.length - 1,
      up: indexv > 0,
      down: indexv < verticalSlides.length - 1
    };
  }
  
  /**
   * Reads the current URL (hash) and navigates accordingly.
   */
  function readURL() {
    // Break the hash down to separate components
    var bits = window.location.hash.slice(2).split('/');
    
    // Read the index components of the hash
    indexh = bits[0] ? parseInt( bits[0] ) : 0;
    indexv = bits[1] ? parseInt( bits[1] ) : 0;
    
    navigateTo( indexh, indexv );
  }
  
  /**
   * Updates the page URL (hash) to reflect the current
   * navigational state. 
   */
  function writeURL() {
    var url = '/';
    
    // Only include the minimum possible number of components in
    // the URL
    if( indexh > 0 || indexv > 0 ) url += indexh;
    if( indexv > 0 ) url += '/' + indexv;
    
    window.location.hash = url;
  }

  /**
   * Navigate to the nexy slide fragment.
   * 
   * @return {Boolean} true if there was a next fragment,
   * false otherwise
   */
  function nextFragment() {
      var fragments;

      if (document.querySelector('#quickpreso-canvas > .present > .present')) {
          fragments = document.querySelectorAll('#quickpreso-canvas > .present > .present > ol > .fragment:not(.visible)');
      } else {
          fragments = document.querySelectorAll('#quickpreso-canvas > .present > ol > .fragment:not(.visible)');
      }

    if( fragments.length ) {
      fragments[0].classList.add( 'visible' );

      return true;
    }

    return false;
  }

  /**
   * Navigate to the previous slide fragment.
   * 
   * @return {Boolean} true if there was a previous fragment,
   * false otherwise
   */
  function previousFragment() {
      var fragments;

      if (document.querySelector('#quickpreso-canvas > .present > .present')) {
          fragments = document.querySelectorAll('#quickpreso-canvas > .present > .present > ol > .fragment.visible');
      } else {
          fragments = document.querySelectorAll('#quickpreso-canvas > .present > ol > .fragment.visible');
      }

    if( fragments.length ) {
      fragments[ fragments.length - 1 ].classList.remove( 'visible' );

      return true;
    }

    return false;
  }
  
  /**
   * Triggers a navigation to the specified indices.
   * 
   * @param {Number} h The horizontal index of the slide to show
   * @param {Number} v The vertical index of the slide to show
   */
  function navigateTo( h, v ) {
    indexh = h === undefined ? indexh : h;
    indexv = v === undefined ? indexv : v;
    
    slide();
  }
  
  function navigateLeft() {
    // Prioritize hiding fragments
    if( previousFragment() === false ) {
      indexh --;
      indexv = 0;
      slide();
    }
  }
  function navigateRight() {
    // Prioritize revealing fragments
    if( nextFragment() === false ) {
      indexh ++;
      indexv = 0;
      slide();
    }
  }
  function navigateUp() {
    // Prioritize hiding fragments
    if( previousFragment() === false ) {
      indexv --;
      slide();
    }
  }
  function navigateDown() {
    // Prioritize revealing fragments
    if( nextFragment() === false ) {
      indexv ++;
      slide();
    }
  }
  
  // Expose some methods publicly
  return {
    initialize: initialize,
    navigateTo: navigateTo,
    navigateLeft: navigateLeft,
    navigateRight: navigateRight,
    navigateUp: navigateUp,
    navigateDown: navigateDown
  };
  
})();

function initQuickPreso(e) {
    var $slideContent = AJS.$('#main-content').clone();
    var $slides;

    e.preventDefault();

    // split slides based on HRs
    $slideContent.find('hr').each(function(){
        AJS.$(this).nextUntil('hr').andSelf().wrapAll('<section data-quickpreso-slide>');
    });
    // get our list of slides
    $slides = $slideContent.find('[data-quickpreso-slide]');

    // clean up
    $slides.find('hr, > br, script').remove();

    // strip our all the confluence image gallery cruft
    $slides.find('p > .confluence-embedded-file-wrapper > .confluence-embedded-image').each(function() {
        var $image = AJS.$(this);
        var $paragraph = $image.parent().parent('p');
        
        if ($image.closest('section')[0] === $slides[0]) {
            $paragraph.append('<img src="' + $image.attr('src') + '" style="margin: 0 1em;" alt="' + $image.attr('alt') + '" />');
            $image.remove();
            $paragraph.find('.confluence-embedded-file-wrapper').remove();
        } else {
            $paragraph.replaceWith('<img src="' + $image.attr('src') + '" alt="' + $image.attr('alt') + '" />');
        }
    });

    $slides.each(function() {
        var $slide = AJS.$(this);
        var $children = $slide.children();

        // fancy boxed navigation
        $slide.find('> h1 + ol').addClass('quickpreso-boxed-list');

        // support fragments that reveal
        $slide.find('> ol:not(.quickpreso-boxed-list) > li').addClass('fragment');

        // single element styles
        if ($children.length === 1) {
            switch ($children[0].tagName) {
                case "H1":
                    $slide.attr('data-quickpreso-slide', 'H1-slide');
                    break;
                case "H2":
                    $slide.attr('data-quickpreso-slide', 'H2-slide');
                    break;
                case "H3":
                    $slide.attr('data-quickpreso-slide', 'H3-slide');
                    break;
                case "H4":
                    $slide.attr('data-quickpreso-slide', 'H4-slide');
                    break;
                case "H5":
                    $slide.attr('data-quickpreso-slide', 'H5-slide');
                    break;
                case "H6":
                    $slide.attr('data-quickpreso-slide', 'H6-slide');
                    break;
                case "IMG":
                    var img = $children[0];
                    $slide.attr('data-quickpreso-slide', 'IMG-slide');
                    $slide.css('background-image', 'url(' + img.getAttribute('src') + ')');
                    AJS.$(img).remove();
                    break;
                case "P":
                    if ($children.find('strong') && $children.find('strong').length === 1) {
                      $slide.attr('data-quickpreso-slide', 'STRONG-slide');
                    }
                    break;
            }
        }

        // double element styles
        if ($children.length === 2) {
            var combo = $children[0].tagName + $children[1].tagName;
            switch (combo) {
                case "H1H2":
                    $slide.attr('data-quickpreso-slide', 'H1H2-slide');
                    break;
                case "H2H3":
                    $slide.attr('data-quickpreso-slide', 'H2H3-slide');
                    break;
                case "H1IMG":
                    $slide.attr('data-quickpreso-slide', 'H1IMG-slide');
                    break;
                case "H2IMG":
                    $slide.attr('data-quickpreso-slide', 'H2IMG-slide');
                    break;
                case "H3IMG":
                    $slide.attr('data-quickpreso-slide', 'H3IMG-slide');
                    break;
                case "H4IMG":
                    $slide.attr('data-quickpreso-slide', 'H4IMG-slide');
                    break;
                case "BLOCKQUOTEP":
                    $slide.attr('data-quickpreso-slide', 'BLOCKQUOTEP-slide');
                    break;
                case "H1OL":
                    $slide.attr('data-quickpreso-slide', 'H1OL-slide');
                    break;
            }
        }

        // complex  styles
        if ($children.length > 2) {
            if (this !== $slides[0] && $slide.find('> h2:first-child + h3')) {
                $slide.attr('data-quickpreso-slide', 'SECTION-slide');
            }
        }
    });

    var $content = AJS.$('<div id="quickpreso-content">');
    var $canvas = AJS.$('<div id="quickpreso-canvas">').append($slideContent.children());

    AJS.$('body').keyup(function(e){
        if (e.keyCode == 27 && AJS.$('#quickpreso-content').length > 0) {
            AJS.$('#quickpreso-content, #quickpreso-content-controls').remove();
            AJS.$('#page').show();
        }
    });

    AJS.$('#page').hide();

    $content.append($canvas).appendTo('body');
    AJS.$('#quickpreso-content').focus();
    AJS.$('<aside id="quickpreso-content-controls"><a class="left" href="#">&#9664;</a><a class="right" href="#">&#9654;</a><a class="up" href="#">&#9650;</a><a class="down" href="#">&#9660;</a></aside>').appendTo('body');

    AJS.EventQueue = AJS.EventQueue || [];
    AJS.EventQueue.push({
        "name": 'quickpreso',
        "properties": {
          "page.id": AJS.Meta.get('page-id'),
          "screen.height": screen.height,
          "screen.width": screen.width,
          "window.height": document.height,
          "window.width": document.width
        }
    });


    Reveal.initialize({
        // Display controls in the bottom right corner
        controls: true,

        // Apply a 3D roll to links on hover
        rollingLinks: false,

        // Styling themes, only affects transitions for now
        theme: 'default' // default/concave/linear
    });

}

if (AJS.$('#main #content').length && AJS.$('#main #navigation').length){

    var trigger = AJS.$('<a href="#" id="quickpreso-trigger" class="aui-button aui-button-subtle"><span>Slideshow</span></a>');

    AJS.$('<li class="ajs-button normal"></li>').append(trigger.click(initQuickPreso)).prependTo('#navigation > .ajs-menu-bar');

    trigger.click();

}
