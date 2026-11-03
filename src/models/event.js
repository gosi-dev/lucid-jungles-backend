const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    fanbaseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'fanbase' },   // optional — event can belong to a Fanbase

    title:       { type: String, required: true },
    description: { type: String },
    date:        { type: Date, required: true },
    location:    { type: String },
    isVirtual:   { type: Boolean, default: false },
    coverImage:  { type: String },
    latitude:    { type: String },
    longitude:   { type: String },

    // Organisers pick up to three tags in the create-event form. Without this path
    // Mongoose strict mode dropped them silently, so the choice never survived the
    // POST that follows the form.
    tags: [String],

    tickets: [{
        name:     { type: String, required: true },   // "General Admission", "VIP", etc.
        price:    { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        quantity: { type: Number, required: true },
        sold:     { type: Number, default: 0 },
        // The Setup Tickets wizard asks for perks and TicketCard renders them
        // (`ticket.description || ticket.perks`). Strict mode was dropping the
        // field silently, so a tier created through the wizard lost its perks
        // before the POST ever reached this model.
        perks:    { type: String }
    }],

    attendees: [{
        userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        name:    { type: String },
        avatar:  { type: String }
    }],

    talents: [{
        name:        { type: String },
        role:        { type: String },
        bio:         { type: String },
        email:       { type: String },
        socialLinks: { type: String },
        avatar:      { type: String }
    }],

    exhibitors: [{
        name:        { type: String },
        description: { type: String },
        services:    { type: String },
        website:     { type: String },
        // The vendor application form asks for a contact email and the
        // /api/invitations/:inviteId/respond route has always read req.body.email, but the
        // path did not exist here, so strict mode dropped it and an exhibitor arrived with
        // no way to be contacted. See also the vendor branch of that route.
        email:       { type: String },
        logo:        { type: String },
        // The event page looks for an image via image|avatar|photo|coverImage and
        // renders up to three product thumbnails beneath it. Neither field existed
        // here, so a fully-populated exhibitor still rendered as two grey boxes.
        image:       { type: String },
        products:    [{ name: { type: String }, image: { type: String } }]
    }],

    sessions: [{
        title:       { type: String },
        time:        { type: String },
        speaker:     { type: String },
        description: { type: String }
    }],

    invitations: [{
        inviteId:  { type: String },
        type:      { type: String },   // 'talent' | 'vendor' | 'exhibitor'
        status:    { type: String },   // 'active' | 'used' | 'expired'
        createdAt: { type: Date },
        usedBy:    { type: String, default: null },
        usedAt:    { type: Date, default: null }
    }]
},
{ timestamps: true });

exports.Event = mongoose.model('event', eventSchema);
