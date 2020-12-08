"use strict";

gsap.registerPlugin(ScrollTrigger); 

gsap.timeline({
    scrollTrigger:{
        trigger:"#top",
        start:"center center",
        end:"bottom -300%",
        markers: false,
        scrub : true,
        pin : true
    }
})

.from("#glow", {
    scaleY : 1,
    scaleX : 1
})
.to("#glow", {
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
    scaleY : 1.5,
    scaleX : 1.5,
    opacity : 1,
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
.from("#space", {
    opacity : 0, 
})

.from("#imgOfTheSun", {
    opacity : 0, 
    scaleY : 14,
    scaleX : 14,
})
.to("#imgOfTheSun", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheMercury", {
    opacity : 0, 
    scaleY : 54,
    scaleX : 54,
    x : innerWidth * 1,
    y : innerHeight * 1
})
.to("#imgOfTheSun", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheVenus", {
    opacity : 0, 
    scaleY : 24,
    scaleX : 24,
    x : innerWidth * -1,
    y : innerHeight * -1
})
.to("#imgOfTheVenus", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheEarth", {
    opacity : 0, 
    scaleY : 20,
    scaleX : 20,
    x : innerWidth * 1,
    y : innerHeight * -1
})
.to("#imgOfTheEarth", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheMars", {
    opacity : 0, 
    scaleY : 50,
    scaleX : 50,
    x : innerWidth * -1,
    y : innerHeight * 1
})
.to("#imgOfTheMars", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheJupiter", {
    opacity : 0, 
    scaleY : 13,
    scaleX : 13,
    x : innerWidth * 0.3,
    y : innerHeight * -0.5
})
.to("#imgOfTheJupiter", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheSaturn", {
    opacity : 0, 
    scaleY : 17,
    scaleX : 17,
    x : innerWidth * -0.8,
    y : innerHeight * 0.1
})
.to("#imgOfTheSaturn", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheUranus", {
    opacity : 0, 
    scaleY : 27,
    scaleX : 27,
    x : innerWidth * 0.5,
    y : innerHeight * -1
})
.to("#imgOfTheUranus", {
    scaleY : 1,
    scaleX : 1
})

.from("#imgOfTheNeptune", {
    opacity : 0, 
    scaleY : 30,
    scaleX : 30,
    x : innerWidth * -1,
    y : innerHeight * 0.5
})
.to("#imgOfTheNeptune", {
    scaleY : 1,
    scaleX : 1
});



gsap.timeline({
     scrollTrigger:{
         trigger:".box",
         start:"center center",
         end:"bottom top",
         markers: false,
         scrub : true,
         pin : true
     }
 })

 .from(".text1", {x : innerWidth * 1})
 .from(".text2", {x : innerWidth * -1})
 .from(".text3", {x : innerWidth * 1})
 .from(".logo", {
     scaleY : 0,
     scaleX : 0
 })

 gsap.timeline({
     scrollTrigger:{
         trigger:".box2",
         start:"center center",
         end:"bottom top",
         markers: false,
         scrub : true,
         pin : true
     }
 })

 .from(".box2", {opacity : 0})
 .from(".text4", {y : innerHeight * 1})
 .from(".text5", {y : innerHeight * -1})
 .from(".text6", {y : innerHeight * 1})

