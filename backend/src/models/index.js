const sequelize = require('../config/database');

const User = require('./User');
const Venue = require('./Venue');
const Event = require('./Event');
const VenueTable = require('./VenueTable');
const Reservation = require('./Reservation');
const Ticket = require('./Ticket');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const AccessLog = require('./AccessLog');
const EventTicketType = require('./EventTicketType');
const VenueStaff = require('./VenueStaff');
const CashClosing = require('./CashClosing');
const Favorite = require('./Favorite');
const EventWaitlist = require('./EventWaitlist');
const GuestListEntry = require('./GuestListEntry');
const SplitPayment = require('./SplitPayment');
const SplitParticipant = require('./SplitParticipant');

User.hasMany(Venue, { foreignKey: 'ownerId', as: 'ownedVenues' });
Venue.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Venue.hasMany(Event, { foreignKey: 'venueId', as: 'events' });
Event.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });

Venue.hasMany(VenueTable, { foreignKey: 'venueId', as: 'venueTables' });
VenueTable.belongsTo(Venue, { foreignKey: 'venueId' });

Event.hasMany(VenueTable, { foreignKey: 'eventId', as: 'tables' });
VenueTable.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Event.hasMany(Reservation, { foreignKey: 'eventId' });
Reservation.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Reservation.belongsTo(VenueTable, { foreignKey: 'tableId', as: 'table' });

User.hasMany(Ticket, { foreignKey: 'userId' });
Ticket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Event.hasMany(Ticket, { foreignKey: 'eventId', as: 'tickets' });
Ticket.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Order.hasMany(Ticket, { foreignKey: 'orderId', as: 'tickets' });
Ticket.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Venue.hasMany(Product, { foreignKey: 'venueId' });
Product.belongsTo(Venue, { foreignKey: 'venueId' });

Venue.hasMany(Order, { foreignKey: 'venueId' });
Order.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Order.belongsTo(VenueTable, { foreignKey: 'tableId', as: 'table' });
Order.belongsTo(User, { foreignKey: 'waiterId', as: 'waiter' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Payment.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });

Event.hasMany(EventTicketType, { foreignKey: 'eventId', as: 'ticketTypes' });
EventTicketType.belongsTo(Event, { foreignKey: 'eventId' });

VenueStaff.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });
VenueStaff.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Venue.hasMany(VenueStaff, { foreignKey: 'venueId' });
User.hasMany(VenueStaff, { foreignKey: 'userId' });

CashClosing.belongsTo(Venue, { foreignKey: 'venueId' });
CashClosing.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
CashClosing.belongsTo(User, { foreignKey: 'closedByUserId', as: 'closedBy' });

AccessLog.belongsTo(Event, { foreignKey: 'eventId' });

User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(EventWaitlist, { foreignKey: 'userId', as: 'waitlistEntries' });
EventWaitlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Event.hasMany(EventWaitlist, { foreignKey: 'eventId', as: 'waitlist' });
EventWaitlist.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Event.hasMany(GuestListEntry, { foreignKey: 'eventId', as: 'guestList' });
GuestListEntry.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Venue.hasMany(GuestListEntry, { foreignKey: 'venueId' });
GuestListEntry.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });
GuestListEntry.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

// Oleada 3 – Split-payment
SplitPayment.hasMany(SplitParticipant, { foreignKey: 'splitId', as: 'participants' });
SplitParticipant.belongsTo(SplitPayment, { foreignKey: 'splitId', as: 'split' });
User.hasMany(SplitPayment, { foreignKey: 'organizerUserId', as: 'organizedSplits' });
SplitPayment.belongsTo(User, { foreignKey: 'organizerUserId', as: 'organizer' });
User.hasMany(SplitParticipant, { foreignKey: 'userId', as: 'splitParticipations' });
SplitParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Event.hasMany(SplitPayment, { foreignKey: 'eventId', as: 'splits' });
SplitPayment.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

module.exports = {
  sequelize,
  User,
  Venue,
  Event,
  VenueTable,
  Reservation,
  Ticket,
  Product,
  Order,
  OrderItem,
  Payment,
  AccessLog,
  EventTicketType,
  VenueStaff,
  CashClosing,
  Favorite,
  EventWaitlist,
  GuestListEntry,
  SplitPayment,
  SplitParticipant,
};
