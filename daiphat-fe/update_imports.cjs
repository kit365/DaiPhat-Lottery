const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Update API imports to Services
    content = content.replace(/['"](.*)\/api\/blog\.api['"]/g, '"$1/services/blog.service"');
    content = content.replace(/['"](.*)\/api\/blog-category\.api['"]/g, '"$1/services/blogCategory.service"');

    // 2. Update hooks imports
    // For pages/blog-category
    content = content.replace(/['"]\.\/hooks\/useBlogCategory['"]/g, '"../../hooks/useBlogCategory"');
    content = content.replace(/['"]\.\.\/hooks\/useBlogCategory['"]/g, '"../../../hooks/useBlogCategory"');
    content = content.replace(/['"]\.\.\/blog-category\/hooks\/useBlogCategory['"]/g, '"../../hooks/useBlogCategory"');
    
    // For pages/blog
    content = content.replace(/['"]\.\/hooks\/useBlog['"]/g, '"../../hooks/useBlog"');
    content = content.replace(/['"]\.\.\/hooks\/useBlog['"]/g, '"../../../hooks/useBlog"');
    content = content.replace(/['"]\.\.\/blog\/hooks\/useBlog['"]/g, '"../../hooks/useBlog"');
    
    // 3. Fix useBlogTag hook imports
    // Since useBlogTags, useCreateBlogTag, etc. are moved to useBlogTag, we need to add new imports.
    const tagHooks = ['useBlogTags', 'useBlogTagsPaged', 'useCreateBlogTag', 'useDeleteBlogTag', 'useUpdateBlogTag'];
    
    // Let's manually fix the 4 files that use tag hooks
    
    if (content !== original) {
        fs.writeFileSync(filePath, content);
    }
}

walkDir('src/admin/pages/blog', processFile);
walkDir('src/admin/pages/blog-category', processFile);
walkDir('src/admin/pages/blog-tag', processFile);
