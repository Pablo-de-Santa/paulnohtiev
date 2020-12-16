"use strict";

gsap.registerPlugin(ScrollTrigger); 

gsap.timeline({
    scrollTrigger:{
        trigger:"#top",
        start:"center center",
        end:"bottom -200%",
        markers: false,
        scrub : true,
        pin : true
    }
})

.from("#myGlow", {
    scaleY : 1,
    scaleX : 1
})
.to("#myGlow", {
    scaleY : 0,
    scaleX : 0
})

.from("#anotherGlow", {
    scaleY : 1,
    scaleX : 1
})
.to("#anotherGlow", {
    scaleY : 0,
    scaleX : 0
})

.from("#bigBang", {
    scaleY : 0,
    scaleX : 0,
    opacity : 1
})
.to("#bigBang", {
    scaleY : 3,
    scaleX : 3,
    opacity : 0
});

gsap.timeline({
    scrollTrigger:{
        trigger:"#afterBang",
        start:"center center",
        end:"bottom -1000%",
        markers: false,
        scrub : true,
        pin : true,
    }
})

.from("#afterBang", {opacity : 0})
.from(".space", {
    opacity : 0, 
})

.from(".imgOfTheSun", {
    opacity : 0, 
    scaleY : 14,
    scaleX : 14,
})
.to(".imgOfTheSun", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheMercury", {
    opacity : 0, 
    scaleY : 54,
    scaleX : 54,
    x : innerWidth * 1,
    y : innerHeight * 1
})
.to(".imgOfTheSun", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheVenus", {
    opacity : 0, 
    scaleY : 24,
    scaleX : 24,
    x : innerWidth * -1,
    y : innerHeight * -1
})
.to(".imgOfTheVenus", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheEarth", {
    opacity : 0, 
    scaleY : 20,
    scaleX : 20,
    x : innerWidth * 1,
    y : innerHeight * -1
})
.to(".imgOfTheEarth", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheMars", {
    opacity : 0, 
    scaleY : 50,
    scaleX : 50,
    x : innerWidth * -1,
    y : innerHeight * 1
})
.to(".imgOfTheMars", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheJupiter", {
    opacity : 0, 
    scaleY : 13,
    scaleX : 13,
    x : innerWidth * 0.3,
    y : innerHeight * -0.5
})
.to(".imgOfTheJupiter", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheSaturn", {
    opacity : 0, 
    scaleY : 17,
    scaleX : 17,
    x : innerWidth * -0.8,
    y : innerHeight * 0.1
})
.to(".imgOfTheSaturn", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheUranus", {
    opacity : 0, 
    scaleY : 27,
    scaleX : 27,
    x : innerWidth * 0.5,
    y : innerHeight * -1
})
.to(".imgOfTheUranus", {
    scaleY : 1,
    scaleX : 1
})

.from(".imgOfTheNeptune", {
    opacity : 0, 
    scaleY : 30,
    scaleX : 30,
    x : innerWidth * -1,
    y : innerHeight * 0.5
})
.to(".imgOfTheNeptune", {
    scaleY : 1,
    scaleX : 1
})

.from(".clickToZoom", {
    opacity : 0, 
    scaleY : 0,
    scaleX : 0
})
.to(".clickToZoom", {
    scaleY : 1,
    scaleX : 1
});


gsap.timeline({
     scrollTrigger:{
         trigger:".box",
         start:"center center",
         end:"bottom -100",
         markers: false,
         scrub : true,
         pin : true
     }
 })

 .from("#text1", {
    y : innerHeight * 1
    })
 .from("#text2", {
     x : innerWidth * -1
    })
 .from("#text3", {
     x : innerWidth * 1
    })
 .from("#text4", {
     x : innerWidth * -1,
     y : innerHeight * -1
    })
 .from("#text5", {
     x : innerWidth * 1,
     y : innerHeight * 1
    })

 .from("#firstRect", {
     scaleY: 1,
     scaleX: 0
     })
     
 .to("#firstRect", {
     scaleY: 1,
     scaleX: 1
    })

 .from("#secondRect", {
     scaleY: 0,
     scaleX: 1
    })
        
 .to("#secondRect", {
     scaleY: 1,
     scaleX: 1
     });


 const sun = document.querySelector(".imgOfTheSun"),
    mercury = document.querySelector(".imgOfTheMercury"),
    venus = document.querySelector(".imgOfTheVenus"),
    earth = document.querySelector(".imgOfTheEarth"),
    mars = document.querySelector(".imgOfTheMars"),
    jupiter = document.querySelector(".imgOfTheJupiter"),
    saturn = document.querySelector(".imgOfTheSaturn"),
    uranus = document.querySelector(".imgOfTheUranus"),
    neptune = document.querySelector(".imgOfTheNeptune");

function toggleSun() {
    sun.classList.toggle("imgOfTheSunClicked");
    }

function toggleMercury() {
    mercury.classList.toggle("imgOfTheMercuryClicked");
    }

function toggleVenus() {
    venus.classList.toggle("imgOfTheVenusClicked");
    }

function toggleEarth() {
    earth.classList.toggle("imgOfTheEarthClicked");
    }

function toggleMars() {
    mars.classList.toggle("imgOfTheMarsClicked");
    }

function toggleJupiter() {
    jupiter.classList.toggle("imgOfTheJupiterClicked");
    }

function toggleSaturn() {
    saturn.classList.toggle("imgOfTheSaturnClicked");
    }

function toggleUranus() {
    uranus.classList.toggle("imgOfTheUranusClicked");
    }

function toggleNeptune() {
    neptune.classList.toggle("imgOfTheNeptuneClicked");
    }

 sun.addEventListener('click', toggleSun);
 mercury.addEventListener('click', toggleMercury);
 venus.addEventListener('click', toggleVenus);
 earth.addEventListener('click', toggleEarth);
 mars.addEventListener('click', toggleMars);
 jupiter.addEventListener('click', toggleJupiter);
 saturn.addEventListener('click', toggleSaturn);
 uranus.addEventListener('click', toggleUranus);
 neptune.addEventListener('click', toggleNeptune);



// Tilt

let VanillaTilt = (function () {

    
    class VanillaTilt {
      constructor(element, settings = {}) {
        if (!(element instanceof Node)) {
          throw ("Can't initialize VanillaTilt because " + element + " is not a Node.");
        }
    
        this.width = null;
        this.height = null;
        this.clientWidth = null;
        this.clientHeight = null;
        this.left = null;
        this.top = null;
    
        // for Gyroscope sampling
        this.gammazero = null;
        this.betazero = null;
        this.lastgammazero = null;
        this.lastbetazero = null;
    
        this.transitionTimeout = null;
        this.updateCall = null;
        this.event = null;
    
        this.updateBind = this.update.bind(this);
        this.resetBind = this.reset.bind(this);
    
        this.element = element;
        this.settings = this.extendSettings(settings);
    
        this.reverse = this.settings.reverse ? -1 : 1;
        this.glare = VanillaTilt.isSettingTrue(this.settings.glare);
        this.glarePrerender = VanillaTilt.isSettingTrue(this.settings["glare-prerender"]);
        this.fullPageListening = VanillaTilt.isSettingTrue(this.settings["full-page-listening"]);
        this.gyroscope = VanillaTilt.isSettingTrue(this.settings.gyroscope);
        this.gyroscopeSamples = this.settings.gyroscopeSamples;
    
        this.elementListener = this.getElementListener();
    
        if (this.glare) {
          this.prepareGlare();
        }
    
        if (this.fullPageListening) {
          this.updateClientSize();
        }
    
        this.addEventListeners();
        this.updateInitialPosition();
      }
    
      static isSettingTrue(setting) {
        return setting === "" || setting === true || setting === 1;
      }
    
      /**
       * Method returns element what will be listen mouse events
       * @return {Node}
       */
      getElementListener() {
        if (this.fullPageListening) {
          return window.document;
        }
    
        if (typeof this.settings["mouse-event-element"] === "string") {
          const mouseEventElement = document.querySelector(this.settings["mouse-event-element"]);
    
          if (mouseEventElement) {
            return mouseEventElement;
          }
        }
    
        if (this.settings["mouse-event-element"] instanceof Node) {
          return this.settings["mouse-event-element"];
        }
    
        return this.element;
      }
    
      /**
       * Method set listen methods for this.elementListener
       * @return {Node}
       */
      addEventListeners() {
        this.onMouseEnterBind = this.onMouseEnter.bind(this);
        this.onMouseMoveBind = this.onMouseMove.bind(this);
        this.onMouseLeaveBind = this.onMouseLeave.bind(this);
        this.onWindowResizeBind = this.onWindowResize.bind(this);
        this.onDeviceOrientationBind = this.onDeviceOrientation.bind(this);
    
        this.elementListener.addEventListener("mouseenter", this.onMouseEnterBind);
        this.elementListener.addEventListener("mouseleave", this.onMouseLeaveBind);
        this.elementListener.addEventListener("mousemove", this.onMouseMoveBind);
    
        if (this.glare || this.fullPageListening) {
          window.addEventListener("resize", this.onWindowResizeBind);
        }
    
        if (this.gyroscope) {
          window.addEventListener("deviceorientation", this.onDeviceOrientationBind);
        }
      }
    
      /**
       * Method remove event listeners from current this.elementListener
       */
      removeEventListeners() {
        this.elementListener.removeEventListener("mouseenter", this.onMouseEnterBind);
        this.elementListener.removeEventListener("mouseleave", this.onMouseLeaveBind);
        this.elementListener.removeEventListener("mousemove", this.onMouseMoveBind);
    
        if (this.gyroscope) {
          window.removeEventListener("deviceorientation", this.onDeviceOrientationBind);
        }
    
        if (this.glare || this.fullPageListening) {
          window.removeEventListener("resize", this.onWindowResizeBind);
        }
      }
    
      destroy() {
        clearTimeout(this.transitionTimeout);
        if (this.updateCall !== null) {
          cancelAnimationFrame(this.updateCall);
        }
    
        this.reset();
    
        this.removeEventListeners();
        this.element.vanillaTilt = null;
        delete this.element.vanillaTilt;
    
        this.element = null;
      }
    
      onDeviceOrientation(event) {
        if (event.gamma === null || event.beta === null) {
          return;
        }
    
        this.updateElementPosition();
    
        if (this.gyroscopeSamples > 0) {
          this.lastgammazero = this.gammazero;
          this.lastbetazero = this.betazero;
    
          if (this.gammazero === null) {
            this.gammazero = event.gamma;
            this.betazero = event.beta;
          } else {
            this.gammazero = (event.gamma + this.lastgammazero) / 2;
            this.betazero = (event.beta + this.lastbetazero) / 2;
          }
    
          this.gyroscopeSamples -= 1;
        }
    
        const totalAngleX = this.settings.gyroscopeMaxAngleX - this.settings.gyroscopeMinAngleX;
        const totalAngleY = this.settings.gyroscopeMaxAngleY - this.settings.gyroscopeMinAngleY;
    
        const degreesPerPixelX = totalAngleX / this.width;
        const degreesPerPixelY = totalAngleY / this.height;
    
        const angleX = event.gamma - (this.settings.gyroscopeMinAngleX + this.gammazero);
        const angleY = event.beta - (this.settings.gyroscopeMinAngleY + this.betazero);
    
        const posX = angleX / degreesPerPixelX;
        const posY = angleY / degreesPerPixelY;
    
        if (this.updateCall !== null) {
          cancelAnimationFrame(this.updateCall);
        }
    
        this.event = {
          clientX: posX + this.left,
          clientY: posY + this.top,
        };
    
        this.updateCall = requestAnimationFrame(this.updateBind);
      }
    
      onMouseEnter() {
        this.updateElementPosition();
        this.element.style.willChange = "transform";
        this.setTransition();
      }
    
      onMouseMove(event) {
        if (this.updateCall !== null) {
          cancelAnimationFrame(this.updateCall);
        }
    
        this.event = event;
        this.updateCall = requestAnimationFrame(this.updateBind);
      }
    
      onMouseLeave() {
        this.setTransition();
    
        if (this.settings.reset) {
          requestAnimationFrame(this.resetBind);
        }
      }
    
      reset() {
        this.event = {
          clientX: this.left + this.width / 2,
          clientY: this.top + this.height / 2
        };
    
        if (this.element && this.element.style) {
          this.element.style.transform = `perspective(${this.settings.perspective}px) ` +
            `rotateX(0deg) ` +
            `rotateY(0deg) ` +
            `scale3d(1, 1, 1)`;
        }
    
        this.resetGlare();
      }
    
      resetGlare() {
        if (this.glare) {
          this.glareElement.style.transform = "rotate(180deg) translate(-50%, -50%)";
          this.glareElement.style.opacity = "0";
        }
      }
    
      updateInitialPosition() {
        if (this.settings.startX === 0 && this.settings.startY === 0) {
          return;
        }
    
        this.onMouseEnter();
    
        if (this.fullPageListening) {
          this.event = {
            clientX: (this.settings.startX + this.settings.max) / (2 * this.settings.max) * this.clientWidth,
            clientY: (this.settings.startY + this.settings.max) / (2 * this.settings.max) * this.clientHeight
          };
        } else {
          this.event = {
            clientX: this.left + ((this.settings.startX + this.settings.max) / (2 * this.settings.max) * this.width),
            clientY: this.top + ((this.settings.startY + this.settings.max) / (2 * this.settings.max) * this.height)
          };
        }
    
    
        let backupScale = this.settings.scale;
        this.settings.scale = 1;
        this.update();
        this.settings.scale = backupScale;
        this.resetGlare();
      }
    
      getValues() {
        let x, y;
    
        if (this.fullPageListening) {
          x = this.event.clientX / this.clientWidth;
          y = this.event.clientY / this.clientHeight;
        } else {
          x = (this.event.clientX - this.left) / this.width;
          y = (this.event.clientY - this.top) / this.height;
        }
    
        x = Math.min(Math.max(x, 0), 1);
        y = Math.min(Math.max(y, 0), 1);
    
        let tiltX = (this.reverse * (this.settings.max - x * this.settings.max * 2)).toFixed(2);
        let tiltY = (this.reverse * (y * this.settings.max * 2 - this.settings.max)).toFixed(2);
        let angle = Math.atan2(this.event.clientX - (this.left + this.width / 2), -(this.event.clientY - (this.top + this.height / 2))) * (180 / Math.PI);
    
        return {
          tiltX: tiltX,
          tiltY: tiltY,
          percentageX: x * 100,
          percentageY: y * 100,
          angle: angle
        };
      }
    
      updateElementPosition() {
        let rect = this.element.getBoundingClientRect();
    
        this.width = this.element.offsetWidth;
        this.height = this.element.offsetHeight;
        this.left = rect.left;
        this.top = rect.top;
      }
    
      update() {
        let values = this.getValues();
    
        this.element.style.transform = "perspective(" + this.settings.perspective + "px) " +
          "rotateX(" + (this.settings.axis === "x" ? 0 : values.tiltY) + "deg) " +
          "rotateY(" + (this.settings.axis === "y" ? 0 : values.tiltX) + "deg) " +
          "scale3d(" + this.settings.scale + ", " + this.settings.scale + ", " + this.settings.scale + ")";
    
        if (this.glare) {
          this.glareElement.style.transform = `rotate(${values.angle}deg) translate(-50%, -50%)`;
          this.glareElement.style.opacity = `${values.percentageY * this.settings["max-glare"] / 100}`;
        }
    
        this.element.dispatchEvent(new CustomEvent("tiltChange", {
          "detail": values
        }));
    
        this.updateCall = null;
      }
    
      /**
       * Appends the glare element (if glarePrerender equals false)
       * and sets the default style
       */
      prepareGlare() {
        // If option pre-render is enabled we assume all html/css is present for an optimal glare effect.
        if (!this.glarePrerender) {
          // Create glare element
          const jsTiltGlare = document.createElement("div");
          jsTiltGlare.classList.add("js-tilt-glare");
    
          const jsTiltGlareInner = document.createElement("div");
          jsTiltGlareInner.classList.add("js-tilt-glare-inner");
    
          jsTiltGlare.appendChild(jsTiltGlareInner);
          this.element.appendChild(jsTiltGlare);
        }
    
        this.glareElementWrapper = this.element.querySelector(".js-tilt-glare");
        this.glareElement = this.element.querySelector(".js-tilt-glare-inner");
    
        if (this.glarePrerender) {
          return;
        }
    
        Object.assign(this.glareElementWrapper.style, {
          "position": "absolute",
          "top": "0",
          "left": "0",
          "width": "100%",
          "height": "100%",
          "overflow": "hidden",
          "pointer-events": "none"
        });
    
        Object.assign(this.glareElement.style, {
          "position": "absolute",
          "top": "50%",
          "left": "50%",
          "pointer-events": "none",
          "background-image": `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
          "width": `${this.element.offsetWidth * 2}px`,
          "height": `${this.element.offsetWidth * 2}px`,
          "transform": "rotate(180deg) translate(-50%, -50%)",
          "transform-origin": "0% 0%",
          "opacity": "0",
        });
      }
    
      updateGlareSize() {
        if (this.glare) {
          Object.assign(this.glareElement.style, {
            "width": `${this.element.offsetWidth * 2}`,
            "height": `${this.element.offsetWidth * 2}`,
          });
        }
      }
    
      updateClientSize() {
        this.clientWidth = window.innerWidth
          || document.documentElement.clientWidth
          || document.body.clientWidth;
    
        this.clientHeight = window.innerHeight
          || document.documentElement.clientHeight
          || document.body.clientHeight;
      }
    
      onWindowResize() {
        this.updateGlareSize();
        this.updateClientSize();
      }
    
      setTransition() {
        clearTimeout(this.transitionTimeout);
        this.element.style.transition = this.settings.speed + "ms " + this.settings.easing;
        if (this.glare) this.glareElement.style.transition = `opacity ${this.settings.speed}ms ${this.settings.easing}`;
    
        this.transitionTimeout = setTimeout(() => {
          this.element.style.transition = "";
          if (this.glare) {
            this.glareElement.style.transition = "";
          }
        }, this.settings.speed);
    
      }
    
      /**
       * Method return patched settings of instance
       * @param {boolean} settings.reverse - reverse the tilt direction
       * @param {number} settings.max - max tilt rotation (degrees)
       * @param {startX} settings.startX - the starting tilt on the X axis, in degrees. Default: 0
       * @param {startY} settings.startY - the starting tilt on the Y axis, in degrees. Default: 0
       * @param {number} settings.perspective - Transform perspective, the lower the more extreme the tilt gets
       * @param {string} settings.easing - Easing on enter/exit
       * @param {number} settings.scale - 2 = 200%, 1.5 = 150%, etc..
       * @param {number} settings.speed - Speed of the enter/exit transition
       * @param {boolean} settings.transition - Set a transition on enter/exit
       * @param {string|null} settings.axis - What axis should be disabled. Can be X or Y
       * @param {boolean} settings.glare - What axis should be disabled. Can be X or Y
       * @param {number} settings.max-glare - the maximum "glare" opacity (1 = 100%, 0.5 = 50%)
       * @param {boolean} settings.glare-prerender - false = VanillaTilt creates the glare elements for you, otherwise
       * @param {boolean} settings.full-page-listening - If true, parallax effect will listen to mouse move events on the whole document, not only the selected element
       * @param {string|object} settings.mouse-event-element - String selector or link to HTML-element what will be listen mouse events
       * @param {boolean} settings.reset - false = If the tilt effect has to be reset on exit
       * @param {gyroscope} settings.gyroscope - Enable tilting by deviceorientation events
       * @param {gyroscopeSensitivity} settings.gyroscopeSensitivity - Between 0 and 1 - The angle at which max tilt position is reached. 1 = 90deg, 0.5 = 45deg, etc..
       * @param {gyroscopeSamples} settings.gyroscopeSamples - How many gyroscope moves to decide the starting position.
       */
      extendSettings(settings) {
        let defaultSettings = {
          reverse: false,
          max: 15,
          startX: 0,
          startY: 0,
          perspective: 1000,
          easing: "cubic-bezier(.03,.98,.52,.99)",
          scale: 1,
          speed: 300,
          transition: true,
          axis: null,
          glare: false,
          "max-glare": 1,
          "glare-prerender": false,
          "full-page-listening": false,
          "mouse-event-element": null,
          reset: true,
          gyroscope: true,
          gyroscopeMinAngleX: -45,
          gyroscopeMaxAngleX: 45,
          gyroscopeMinAngleY: -45,
          gyroscopeMaxAngleY: 45,
          gyroscopeSamples: 10
        };
    
        let newSettings = {};
        for (var property in defaultSettings) {
          if (property in settings) {
            newSettings[property] = settings[property];
          } else if (this.element.hasAttribute("data-tilt-" + property)) {
            let attribute = this.element.getAttribute("data-tilt-" + property);
            try {
              newSettings[property] = JSON.parse(attribute);
            } catch (e) {
              newSettings[property] = attribute;
            }
    
          } else {
            newSettings[property] = defaultSettings[property];
          }
        }
    
        return newSettings;
      }
    
      static init(elements, settings) {
        if (elements instanceof Node) {
          elements = [elements];
        }
    
        if (elements instanceof NodeList) {
          elements = [].slice.call(elements);
        }
    
        if (!(elements instanceof Array)) {
          return;
        }
    
        elements.forEach((element) => {
          if (!("vanillaTilt" in element)) {
            element.vanillaTilt = new VanillaTilt(element, settings);
          }
        });
      }
    }
    
    if (typeof document !== "undefined") {
      /* expose the class to window */
      window.VanillaTilt = VanillaTilt;
    
      /**
       * Auto load
       */
      VanillaTilt.init(document.querySelectorAll("[data-tilt]"));
    }
    
    return VanillaTilt;
    
    }());

    VanillaTilt.init(document.querySelectorAll(".box"), {
        max: 12,
        speed: 400
    });

    // Stars

    $( function() {

        console.log( 'loaded' );
      
        let $canvas = $( '.canvas' ),
            canvasWidth = $canvas.outerWidth(),
            canvasHeight = $canvas.outerHeight();
      
        starField();
      
      
        function starField() {
          const maxStars = 1000;
          for( let i = 0; i < maxStars; i++ ) {
            let elem = document.createElement( "div" );
            let size = Math.floor( Math.random() * 8 + 1 );
            $( elem ).addClass( 'star' );
            $( elem ).css( {
              left   : Math.floor( Math.random() * canvasWidth ),
              top    : Math.floor( Math.random() * canvasHeight ),
              opacity: Math.random(),
              width  : size,
              height : size
            } );
      
            $canvas.append( elem );
          }
          var $star = $( '.star' );
          var stl = new TimelineMax( {yoyo: true} );
          stl.add( TweenMax.staggerTo( $star.slice( 1, (maxStars / 10) ), 0.5, {
            autoAlpha  : 0.25,
            scale      : 0.25,
            yoyo       : true,
            repeat     : -1,
            repeatDelay: 1,
            ease       : Bounce.easeOut
          }, 0.05 ) );
        }
      
        var $streak = $( '.streak' );
      
        function shootingStar() {
            var tl = new TimelineMax( { delay: Math.random() * 3 } ),
              scale = (Math.random() * 3 + 0.5);
          tl.set( $streak, { left: Math.random() * canvasWidth, top: 0, scale: 0 } )
              .to( $streak, scale, { left: '-=250', top: '+=550', scale: scale, autoAlpha: 1, ease: SlowMo.easeOut } )
              .to( $streak, scale, { left: '-=250', top: '+=550', scale: 0, autoAlpha: 0, ease: SlowMo.easeOut, onComplete: shootingStar }, '-=.8' );
        }
      
        shootingStar();
      
      } );

      gsap.timeline({
        scrollTrigger:{
            trigger:".box2",
            start:"center center",
            end:"bottom -100",
            markers: false,
            scrub : true,
            pin : true
        }
    })
   
    .from(".box2", {
        opacity : 0
       })
    .from(".text6", {
        y : innerHeight * 1
       })
    .from(".text7", {
        y : innerHeight * -1
       })
    .from(".text8", {
        y : innerHeight * 1
       });