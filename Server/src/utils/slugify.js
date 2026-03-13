function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // spaces to hyphens
    .replace(/[^\w\-]+/g, '')    // remove non-word chars (except hyphens)
    .replace(/\-\-+/g, '-')      // replace multiple hyphens with one
    .replace(/^-+/, '')           // trim hyphens from start
    .replace(/-+$/, '');          // trim hyphens from end
}

module.exports = { slugify };