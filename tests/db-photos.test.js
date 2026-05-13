const { initDb } = require('../src/db');

describe('guest_photos DB', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('inserts a photo row and returns it by id', () => {
    const { id } = db.insertGuestPhoto({
      media_type: 'photo',
      filename: 'abc.jpg',
      thumb_filename: 'abc.jpg',
      mime_type: 'image/jpeg',
      width: 1920, height: 1280,
      duration_sec: null,
      size_bytes: 100000,
      caption: 'hi', uploader_name: 'Marie',
    });
    const row = db.getGuestPhotoById(id);
    expect(row.filename).toBe('abc.jpg');
    expect(row.hidden).toBe(0);
    expect(row.uploaded_at).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('listVisibleGuestPhotos returns newest first and excludes hidden', () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:1 });
    const b = db.insertGuestPhoto({ media_type:'photo', filename:'b.jpg', thumb_filename:'b.jpg', mime_type:'image/jpeg', size_bytes:1 });
    db.setGuestPhotoHidden(a.id, 1);
    const list = db.listVisibleGuestPhotos({ limit: 30 });
    expect(list.items.map(r => r.id)).toEqual([b.id]);
    expect(list.next_cursor).toBeNull();
  });

  test('cursor pagination returns next page', () => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      ids.push(db.insertGuestPhoto({ media_type:'photo', filename:`f${i}.jpg`, thumb_filename:`f${i}.jpg`, mime_type:'image/jpeg', size_bytes:1 }).id);
    }
    const page1 = db.listVisibleGuestPhotos({ limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.next_cursor).toBeTruthy();
    const page2 = db.listVisibleGuestPhotos({ limit: 2, cursor: page1.next_cursor });
    expect(page2.items).toHaveLength(2);
    expect(page2.items[0].id).not.toBe(page1.items[1].id);
  });

  test('deleteGuestPhoto removes the row', () => {
    const { id } = db.insertGuestPhoto({ media_type:'photo', filename:'x.jpg', thumb_filename:'x.jpg', mime_type:'image/jpeg', size_bytes:1 });
    expect(db.deleteGuestPhoto(id)).toBe(1);
    expect(db.getGuestPhotoById(id)).toBeNull();
  });

  test('getGuestPhotoStats returns count and total bytes', () => {
    db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:1000 });
    db.insertGuestPhoto({ media_type:'video', filename:'a.mp4', thumb_filename:'a.jpg', mime_type:'video/mp4', size_bytes:5000 });
    expect(db.getGuestPhotoStats()).toEqual({ total: 2, hidden: 0, total_bytes: 6000 });
  });

  test('listAllGuestPhotos includes hidden rows for admin', () => {
    const a = db.insertGuestPhoto({ media_type:'photo', filename:'a.jpg', thumb_filename:'a.jpg', mime_type:'image/jpeg', size_bytes:1 });
    db.setGuestPhotoHidden(a.id, 1);
    expect(db.listAllGuestPhotos()).toHaveLength(1);
  });
});
