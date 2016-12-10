require 'opal'
require 'opal-parser'
require 'sass'

def sassBuilder(template, opts)
  return Sass::Engine.new(template, opts).render
end
