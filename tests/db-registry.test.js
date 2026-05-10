const { initDb } = require('../src/db');

describe('registry DB methods', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });
  afterEach(() => { db.close(); });

  test('insertRegistryItem creates item', () => {
    const result = db.insertRegistryItem({ title: 'Honeymoon fund', description: 'Contribution' });
    expect(result.changes).toBe(1);
  });

  test('getAllRegistryItems returns empty array initially', () => {
    expect(db.getAllRegistryItems()).toEqual([]);
  });

  test('getRegistryItemById returns item with null claimed_by_rsvp_id', () => {
    db.insertRegistryItem({ title: 'Test' });
    const [item] = db.getAllRegistryItems();
    const found = db.getRegistryItemById(item.id);
    expect(found.title).toBe('Test');
    expect(found.claimed_by_rsvp_id).toBeNull();
  });

  test('getRegistryItemById returns null for unknown id', () => {
    expect(db.getRegistryItemById(999)).toBeNull();
  });

  test('getRsvpByEmail returns rsvp row', () => {
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const rsvp = db.getRsvpByEmail('alice@example.com');
    expect(rsvp.name).toBe('Alice');
  });

  test('getRsvpByEmail returns null for unknown email', () => {
    expect(db.getRsvpByEmail('nobody@example.com')).toBeNull();
  });

  test('claimRegistryItem sets claimed_by_rsvp_id', () => {
    db.insertRegistryItem({ title: 'Test' });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    expect(db.getRegistryItemById(item.id).claimed_by_rsvp_id).toBe(rsvp.id);
  });

  test('unclaimRegistryItem clears claimed_by_rsvp_id', () => {
    db.insertRegistryItem({ title: 'Test' });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    db.unclaimRegistryItem(item.id);
    expect(db.getRegistryItemById(item.id).claimed_by_rsvp_id).toBeNull();
  });

  test('deleteRegistryItem removes unclaimed item, returns changes=1', () => {
    db.insertRegistryItem({ title: 'Test' });
    const [item] = db.getAllRegistryItems();
    expect(db.deleteRegistryItem(item.id).changes).toBe(1);
    expect(db.getAllRegistryItems()).toHaveLength(0);
  });

  test('deleteRegistryItem does nothing for claimed item, returns changes=0', () => {
    db.insertRegistryItem({ title: 'Test' });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    expect(db.deleteRegistryItem(item.id).changes).toBe(0);
  });

  test('getClaimedItemByRsvpId returns the item claimed by this rsvp', () => {
    db.insertRegistryItem({ title: 'Test' });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    expect(db.getClaimedItemByRsvpId(rsvp.id).id).toBe(item.id);
  });

  test('getClaimedItemByRsvpId returns null when nothing claimed', () => {
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const rsvp = db.getRsvpByEmail('alice@example.com');
    expect(db.getClaimedItemByRsvpId(rsvp.id)).toBeNull();
  });

  test('getRegistryItemsWithClaimer returns claimer_name for claimed items', () => {
    db.insertRegistryItem({ title: 'Test' });
    db.insertRsvp({ name: 'Alice', email: 'alice@example.com', attending: 1 });
    const [item] = db.getAllRegistryItems();
    const rsvp = db.getRsvpByEmail('alice@example.com');
    db.claimRegistryItem(item.id, rsvp.id);
    const items = db.getRegistryItemsWithClaimer();
    expect(items[0].claimer_name).toBe('Alice');
  });

  test('getRegistryItemsWithClaimer returns null claimer_name for unclaimed items', () => {
    db.insertRegistryItem({ title: 'Test' });
    const items = db.getRegistryItemsWithClaimer();
    expect(items[0].claimer_name).toBeNull();
  });
});
