/**
 * Use if you have Riot.js templates to compile.
 *
 * The default setup assumes ES6 scripting in the templates.
 */
module.exports = function (grunt, options)
{
  return {
    options:
    {
      type:    'es6',
      modular: 'amd',
    },
    dist: 
    {
      expand: true,
      cwd:    'src/riot',
      src:    ['**/*.tag'],
      dest:   'scripts/tags/nano/',
      ext:    '.js',
    }
  };
}
