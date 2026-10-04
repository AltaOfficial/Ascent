import { descendantIds, wouldCreateCycle } from './folder-tree';

//  programming
//  ├── web
//  │   └── frontend
//  └── backend
//  school
const folders = [
  { id: 'programming', parentId: null },
  { id: 'web', parentId: 'programming' },
  { id: 'frontend', parentId: 'web' },
  { id: 'backend', parentId: 'programming' },
  { id: 'school', parentId: null },
];

describe('wouldCreateCycle', () => {
  it('allows moving to the top level or a sibling branch', () => {
    expect(wouldCreateCycle(folders, 'web', null)).toBe(false);
    expect(wouldCreateCycle(folders, 'web', 'school')).toBe(false);
    expect(wouldCreateCycle(folders, 'frontend', 'backend')).toBe(false);
  });

  it('refuses dropping a folder into itself', () => {
    expect(wouldCreateCycle(folders, 'web', 'web')).toBe(true);
  });

  it('refuses dropping a folder into its own descendant', () => {
    expect(wouldCreateCycle(folders, 'programming', 'frontend')).toBe(true);
    expect(wouldCreateCycle(folders, 'web', 'frontend')).toBe(true);
  });

  it('refuses when existing data already loops', () => {
    const looped = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ];
    expect(wouldCreateCycle(looped, 'c', 'a')).toBe(true);
  });
});

describe('descendantIds', () => {
  it('collects nested folders at any depth', () => {
    expect(descendantIds(folders, 'programming').sort()).toEqual(
      ['backend', 'frontend', 'web'].sort(),
    );
    expect(descendantIds(folders, 'school')).toEqual([]);
  });
});
