class Random
  attr_reader :seed, :state

  %x{
    /* jshint ignore:start */
    /* seedrandom.min.js 2.4.1 https://github.com/davidbau/seedrandom + PR https://github.com/davidbau/seedrandom/pull/36 */
    !function(a,b){function c(c,j,k){var n=[];j=1==j?{entropy:!0}:j||{};var s=g(f(j.entropy?[c,i(a)]:null==c?h():c,3),n),t=new d(n),u=function(){for(var a=t.g(m),b=p,c=0;a<q;)a=(a+c)*l,b*=l,c=t.g(1);for(;a>=r;)a/=2,b/=2,c>>>=1;return(a+c)/b};return u.int32=function(){return 0|t.g(4)},u.quick=function(){return t.g(4)/4294967296},u.double=u,g(i(t.S),a),(j.pass||k||function(a,c,d,f){return f&&(f.S&&e(f,t),a.state=function(){return e(t,{})}),d?(b[o]=a,c):a})(u,s,"global"in j?j.global:this==b,j.state)}function d(a){var b,c=a.length,d=this,e=0,f=d.i=d.j=0,g=d.S=[];for(c||(a=[c++]);e<l;)g[e]=e++;for(e=0;e<l;e++)g[e]=g[f=s&f+a[e%c]+(b=g[e])],g[f]=b;(d.g=function(a){for(var b,c=0,e=d.i,f=d.j,g=d.S;a--;)b=g[e=s&e+1],c=c*l+g[s&(g[e]=g[f=s&f+b])+(g[f]=b)];return d.i=e,d.j=f,c})(l)}function e(a,b){return b.i=a.i,b.j=a.j,b.S=a.S.slice(),b}function f(a,b){var c,d=[],e=typeof a;if(b&&"object"==e)for(c in a)if(a.hasOwnProperty(c))try{d.push(f(a[c],b-1))}catch(a){}return d.length?d:"string"==e?a:a+"\0"}function g(a,b){for(var c,d=a+"",e=0;e<d.length;)b[s&e]=s&(c^=19*b[s&e])+d.charCodeAt(e++);return i(b)}function h(){try{if(j)return i(j.randomBytes(l));var b=new Uint8Array(l);return(k.crypto||k.msCrypto).getRandomValues(b),i(b)}catch(b){var c=k.navigator,d=c&&c.plugins;return[+new Date,k,d,k.screen,i(a)]}}function i(a){return String.fromCharCode.apply(0,a)}var j,k=this,l=256,m=6,n=52,o="random",p=b.pow(l,m),q=b.pow(2,n),r=2*q,s=l-1;if(b["seed"+o]=c,g(b.random(),a),"object"==typeof module&&module.exports){module.exports=c;try{}catch(a){}}else"function"==typeof define&&define.amd&&define(function(){return c})}([],Math);
    /* jshint ignore:end */
  }

  def initialize(seed = Random.new_seed)
    seed = Opal.coerce_to!(seed, Integer, :to_int)
    @state = seed
    reseed(seed)
  end

  def reseed(seed)
    @seed = seed
    `self.$rng = new Math.seedrandom(seed);`
  end

  `var $seed_generator = new Math.seedrandom('opal', { entropy: true });`

  def self.new_seed
    %x{
      return Math.abs($seed_generator.int32());
    }
  end

  def self.rand(limit = undefined)
    DEFAULT.rand(limit)
  end


  def self.srand(n = Random.new_seed)
    n = Opal.coerce_to!(n, Integer, :to_int)

    previous_seed = DEFAULT.seed
    DEFAULT.reseed(n)
    previous_seed
  end

  DEFAULT = new(new_seed)

  def ==(other)
    return false unless Random === other

    seed == other.seed && state == other.state
  end

  def bytes(length)
    length = Opal.coerce_to!(length, Integer, :to_int)
    length
      .times
      .map { rand(255).chr }
      .join
      .encode(Encoding::ASCII_8BIT)
  end

  def rand(limit = undefined)
    %x{
      function randomFloat() {
        self.state++;
        return self.$rng.quick();
      }

      function randomInt() {
        return Math.floor(randomFloat() * limit);
      }

      function randomRange() {
        var min = limit.begin,
            max = limit.end;

        if (min === nil || max === nil) {
          return nil;
        }

        var length = max - min;

        if (length < 0) {
          return nil;
        }

        if (length === 0) {
          return min;
        }

        if (max % 1 === 0 && min % 1 === 0 && !limit.exclude) {
          length++;
        }

        return self.$rand(length) + min;
      }

      if (limit == null) {
        return randomFloat();
      } else if (limit.$$is_range) {
        return randomRange();
      } else if (limit.$$is_number) {
        if (limit <= 0) {
          #{raise ArgumentError, "invalid argument - #{limit}"}
        }

        if (limit % 1 === 0) {
          // integer
          return randomInt();
        } else {
          return randomFloat() * limit;
        }
      } else {
        limit = #{Opal.coerce_to!(limit, Integer, :to_int)};

        if (limit <= 0) {
          #{raise ArgumentError, "invalid argument - #{limit}"}
        }

        return randomInt();
      }
    }
  end
end
