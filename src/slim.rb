require 'opal'
require 'opal-parser'

require 'thread'
require 'slim'

def slimBuilder(template, opts)
  version = (defined? Slim::VERSION) ? Slim::VERSION : Slim.version

  if version < '0.7.0'
    return Slim::Engine.new(template).render
  else
    return Slim::Template.new(opts){ template }.render(opts[:scope] || Hash.new)
  end
end
