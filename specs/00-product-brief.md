# OpenSOS Product Brief

OpenSOS is a real-time coordination platform for emergencies that allows individuals and organizations to publish and fulfill requests for resources (food, water, shelter, logistics).

Core problem:
During emergencies, resource coordination breaks down because information is fragmented, duplicated, and quickly becomes outdated across many channels (WhatsApp groups, spreadsheets, social posts, phone calls). This creates a gap between **what is needed**, **what is available**, and **what is actually delivered**, leading to waste, bottlenecks, and slower response times when minutes matter. OpenSOS provides a single operational map and a shared status lifecycle so different actors can coordinate with the same source of truth.

Concrete problems we see in the field:
- Unnecessary items are shipped (donations and shipments arrive that do not match real needs, displacing priority items and consuming volunteer time).
- Organizations and warehouses collapse under excess stock (warehouses overflow with unmanaged inventory, creating sorting backlogs, storage constraints, and sometimes spoilage).
- Multiple organizations work the same request in parallel, causing duplication and missed coverage elsewhere.
- Requests/offers lack clear ownership and status, so the same need is reposted repeatedly and resolution is hard to verify.
- Limited visibility of capacity (storage space, volunteers, transport availability) means “available” resources are not actually deliverable.

Core features:
- Map-based interface (Mapbox)
- Pins for needs and offers
- Real-time updates scoped by emergency event
- Status lifecycle for each request
- Basic moderation and reporting

Out of scope (MVP):
- Payments
- Complex logistics routing
- Mobile native apps

Primary users:
- Citizens
- NGOs
- Local organizations
- Volunteers
