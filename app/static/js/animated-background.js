/**
 * Animated Particle Background System
 * @author Alex Andrix <alex@alexandrix.com>
 * @since 2018-12-02
 */

var App = {};
App.setup = function() {
  // Use existing canvas or create new one with blur effects
  var canvas = document.getElementById('particle-canvas') || document.createElement('canvas');
  this.filename = "spipa";
  canvas.id = 'particle-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  canvas.style.filter = 'blur(4px)';
  canvas.style.opacity = '1';
  canvas.style.mixBlendMode = 'screen';
  this.canvas = canvas;
  
  // Only append if it's not already in the DOM
  if (!document.getElementById('particle-canvas')) {
    var animatedBg = document.querySelector('.animated-background');
    if (animatedBg) {
      animatedBg.appendChild(canvas);
    } else {
      document.getElementsByTagName('body')[0].appendChild(canvas);
    }
  }
  
  this.ctx = this.canvas.getContext('2d');
  this.width = this.canvas.width;
  this.height = this.canvas.height;
  this.dataToImageRatio = 1;
  this.ctx.imageSmoothingEnabled = false;
  this.ctx.webkitImageSmoothingEnabled = false;
  this.ctx.msImageSmoothingEnabled = false;
  this.xC = this.width / 2;
  this.yC = this.height / 2;
  
  this.stepCount = 0;
  this.particles = [];
  this.lifespan = 2500; // Increased lifespan even more for ultra-slow movement
  this.popPerBirth = 1;
  this.maxPop = 150; // Further reduced max population
  this.birthFreq = 8; // Much slower birth frequency (was 4, now 8)

  // Build grid
  this.gridSize = 8;// Motion coords
  this.gridSteps = Math.floor(1000 / this.gridSize);
  this.grid = [];
  var i = 0;
  for (var xx = -500; xx < 500; xx += this.gridSize) {
    for (var yy = -500; yy < 500; yy += this.gridSize) {
      // Radial field, triangular function of r with max around r0
      var r = Math.sqrt(xx*xx+yy*yy),
          r0 = 100,
          field;
      
      if (r < r0) field = 255 / r0 * r;
      else if (r > r0) field = 255 - Math.min(255, (r - r0)/2);
      
      this.grid.push({
        x: xx,
        y: yy,
        busyAge: 0,
        spotIndex: i,
        isEdge: (xx == -500 ? 'left' : 
                 (xx == (-500 + this.gridSize * (this.gridSteps-1)) ? 'right' : 
                  (yy == -500 ? 'top' : 
                   (yy == (-500 + this.gridSize *(this.gridSteps-1)) ? 'bottom' : 
                    false
                   )
                  )
                 )
                ),
        field: field
      });
      i++;
    }
  }
  this.gridMaxIndex = i;
  
  // Counters for UI
  this.drawnInLastFrame = 0;
  this.deathCount = 0;
  
  this.initDraw();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.xC = this.width / 2;
    this.yC = this.height / 2;
  });
};

App.evolve = function() {
  this.stepCount++;
  
  // Increment all grid ages
  this.grid.forEach(function(e) {
    if (e.busyAge > 0) e.busyAge++;
  });
  
  if (this.stepCount % this.birthFreq == 0 && (this.particles.length + this.popPerBirth) < this.maxPop) {
    this.birth();
  }
  App.move();
  App.draw();
};

App.birth = function() {
  var x, y;
  var gridSpotIndex = Math.floor(Math.random() * this.gridMaxIndex),
      gridSpot = this.grid[gridSpotIndex],
      x = gridSpot.x, y = gridSpot.y;
  
  var particle = {
    hue: 200,// + Math.floor(50*Math.random()),
    sat: 95,//30 + Math.floor(70*Math.random()),
    lum: 20 + Math.floor(40*Math.random()),
    x: x, y: y,
    xLast: x, yLast: y,
    xSpeed: 0, ySpeed: 0,
    age: 0,
    ageSinceStuck: 0,
    attractor: {
      oldIndex: gridSpotIndex,
      gridSpotIndex: gridSpotIndex,// Pop at random position on grid
    },
    name: 'seed-' + Math.ceil(10000000 * Math.random())
  };
  this.particles.push(particle);
};

App.kill = function(particleName) {
 var newArray = this.particles.filter(function(seed) {
    return (seed.name !== particleName);
  });
  this.particles = newArray;
};

App.move = function() {
  for (var i = 0; i < this.particles.length; i++) {
    // Get particle
    var p = this.particles[i];
    
    // Save last position
    p.xLast = p.x; p.yLast = p.y;
    
    // Attractor and corresponding grid spot
    var index = p.attractor.gridSpotIndex,
        gridSpot = this.grid[index];
    
    // Maybe move attractor and with certain constraints
    if (Math.random() < 0.5) {
      // Move attractor
      if (!gridSpot.isEdge) {
        // Change particle's attractor grid spot and local move function's grid spot
        var topIndex = index - 1,
            bottomIndex = index + 1,
            leftIndex = index - this.gridSteps,
            rightIndex = index + this.gridSteps,
            topSpot = this.grid[topIndex],
            bottomSpot = this.grid[bottomIndex],
            leftSpot = this.grid[leftIndex],
            rightSpot = this.grid[rightIndex];
        
        // Choose neighbour with highest field value (with some desobedience...)
        var chaos = 30;
        var maxFieldSpot = [topSpot, bottomSpot, leftSpot, rightSpot].reduce(function(max, spot) {
          return (spot.field + chaos * Math.random()) > (max.field + chaos * Math.random()) ? spot : max;
        });
        
        var potentialNewGridSpot = maxFieldSpot;
        if (potentialNewGridSpot.busyAge == 0 || potentialNewGridSpot.busyAge > 15) {// Allow wall fading
        //if (potentialNewGridSpot.busyAge == 0) {// Spots busy forever
          // Ok it's free let's go there
          p.ageSinceStuck = 0;// Not stuck anymore yay
          p.attractor.oldIndex = index;
          p.attractor.gridSpotIndex = potentialNewGridSpot.spotIndex;
          gridSpot = potentialNewGridSpot;
          gridSpot.busyAge = 1;
        } else p.ageSinceStuck++;
        
      } else p.ageSinceStuck++;
      
      if (p.ageSinceStuck == 10) this.kill(p.name);
    }
    
    // Spring attractor to center with viscosity
    var k = 4, visc = 0.8; // Reduced spring constant and increased viscosity for slower movement
    var dx = p.x - gridSpot.x,
        dy = p.y - gridSpot.y,
        dist = Math.sqrt(dx*dx + dy*dy);
    
    // Spring
    var xAcc = -k * dx,
        yAcc = -k * dy;
    
    p.xSpeed += xAcc; p.ySpeed += yAcc;
    
    // Calm the f*ck down
    p.xSpeed *= visc; p.ySpeed *= visc;
    
    // Store stuff in particle brain
    p.speed = Math.sqrt(p.xSpeed * p.xSpeed + p.ySpeed * p.ySpeed);
    p.dist = dist;
    
    // Update position
    p.x += 0.001 * p.xSpeed; p.y += 0.001 * p.ySpeed;
    
    // Get older
    p.age++;
    
    // Kill if too old
    if (p.age > this.lifespan) {
      this.kill(p.name);
      this.deathCount++;
    }
  }
};

App.initDraw = function() {
  this.ctx.beginPath();
  this.ctx.rect(0, 0, this.width, this.height);
  this.ctx.fillStyle = 'black';
  this.ctx.fill();
  this.ctx.closePath();
};

App.draw = function() {
  this.drawnInLastFrame = 0;
  if (!this.particles.length) return false;
  
  this.ctx.beginPath();
  this.ctx.rect(0, 0, this.width, this.height);
  this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  this.ctx.fill();
  this.ctx.closePath();
  
  for (var i = 0; i < this.particles.length; i++) {
    // Draw particle
    var p = this.particles[i];
    
    var h, s, l, a;
    
    h = p.hue + this.stepCount/300;
    s = p.sat;
    l = p.lum;
    a = 1;
    
    var last = this.dataXYtoCanvasXY(p.xLast, p.yLast),
        now = this.dataXYtoCanvasXY(p.x, p.y);
    var attracSpot = this.grid[p.attractor.gridSpotIndex],
        attracXY = this.dataXYtoCanvasXY(attracSpot.x, attracSpot.y);
    var oldAttracSpot = this.grid[p.attractor.oldIndex],
        oldAttracXY = this.dataXYtoCanvasXY(oldAttracSpot.x, oldAttracSpot.y);
    
    this.ctx.beginPath();
    
    this.ctx.strokeStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
    this.ctx.fillStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
    
    // Particle trail
    this.ctx.moveTo(last.x, last.y);
    this.ctx.lineTo(now.x, now.y);
    
    this.ctx.lineWidth = 1.5 * this.dataToImageRatio;
    this.ctx.stroke();
    this.ctx.closePath();
    
    // Attractor positions
    this.ctx.beginPath();
    this.ctx.lineWidth = 1.5 * this.dataToImageRatio;
    this.ctx.moveTo(oldAttracXY.x, oldAttracXY.y);
    this.ctx.lineTo(attracXY.x, attracXY.y);
    this.ctx.arc(attracXY.x, attracXY.y, 1.5 * this.dataToImageRatio, 0, 2 * Math.PI, false);
    
    this.ctx.strokeStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
    this.ctx.fillStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
    this.ctx.stroke();
    this.ctx.fill();
    
    this.ctx.closePath();
    
    // UI counter
    this.drawnInLastFrame++;
  }
};

App.dataXYtoCanvasXY = function(x, y) {
  var zoom = 1.6;
  var xx = this.xC + x * zoom * this.dataToImageRatio,
      yy = this.yC + y * zoom * this.dataToImageRatio;
  
  return {x: xx, y: yy};
};

// Initialize the ultra-blur particle background system
document.addEventListener('DOMContentLoaded', function() {
  // Apply ultra-blur mode for maximum effect
  document.body.classList.add('ultra-blur-mode');
  
  // Initialize the particle system
  App.setup();
  
  // Start the animation loop with heavy blur
  function animate() {
    App.evolve();
    requestAnimationFrame(animate);
  }
  animate();
  
  // Add additional blur effects on window events
  window.addEventListener('load', function() {
    var canvas = document.getElementById('particle-canvas');
    if (canvas) {
      canvas.style.filter = 'blur(4px)';
      canvas.style.opacity = '1';
    }
  });
});
