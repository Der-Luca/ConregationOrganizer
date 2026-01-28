import { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import api from "../../api";
import BookingModal from "./BookingModal";
const localizer = momentLocalizer(moment);

export default function UserBookings() {
  const [events, setEvents] = useState([]);
  const [carts, setCarts] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("week"); // month, week, day
  const [date, setDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    loadCarts();
    loadUsers();
    loadCalendarBookings();
  }, [date, view]);

  async function loadCarts() {
    const res = await api.get("/carts");
    setCarts(res.data);
  }

  async function loadUsers() {
    const res = await api.get("/users/bookable-users");
    setUsers(res.data);
  }

  async function loadCalendarBookings() {
    // Calculate date range based on current view
    const { start, end } = getDateRange();
    
    try {
      const res = await api.get("/bookings/calendar", {
        params: {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        },
      });

      // Transform API data to calendar events
      const calendarEvents = res.data.map((booking) => ({
        id: booking.id,
        title: `${booking.cart_name} - ${booking.participant_names.join(", ")}`,
        start: new Date(booking.start_datetime),
        end: new Date(booking.end_datetime),
        resource: booking,
      }));

      setEvents(calendarEvents);
    } catch (err) {
      console.error("Error loading bookings:", err);
    }
  }

  function getDateRange() {
    const start = moment(date).startOf(view === "month" ? "month" : "week").toDate();
    const end = moment(date).endOf(view === "month" ? "month" : "week").toDate();
    return { start, end };
  }

  function handleSelectSlot(slotInfo) {
    // User clicked on empty slot - open booking modal
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end,
    });
    setShowModal(true);
  }

  function handleSelectEvent(event) {
    // User clicked on existing booking - show details
    alert(
      `Buchung Details:\n` +
      `Cart: ${event.resource.cart_name}\n` +
      `Teilnehmer: ${event.resource.participant_names.join(", ")}\n` +
      `Von: ${moment(event.start).format("DD.MM.YYYY HH:mm")}\n` +
      `Bis: ${moment(event.end).format("DD.MM.YYYY HH:mm")}`
    );
  }

  async function handleBookingCreate(bookingData) {
    try {
      await api.post("/bookings", bookingData);
      setShowModal(false);
      setSelectedSlot(null);
      loadCalendarBookings(); // Reload calendar
    } catch (err) {
      throw err; // Let modal handle error display
    }
  }

  // Custom event styling
  function eventStyleGetter(event) {
    const style = {
      backgroundColor: "#171717",
      borderRadius: "6px",
      opacity: 0.9,
      color: "white",
      border: "0px",
      display: "block",
    };
    return { style };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cart Kalender</h1>
        
        {/* View Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 rounded ${
              view === "month"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 hover:bg-neutral-200"
            }`}
          >
            Monat
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 rounded ${
              view === "week"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 hover:bg-neutral-200"
            }`}
          >
            Woche
          </button>
          <button
            onClick={() => setView("day")}
            className={`px-3 py-1 rounded ${
              view === "day"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 hover:bg-neutral-200"
            }`}
          >
            Tag
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white border rounded-xl p-4" style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          messages={{
            today: "Heute",
            previous: "Zurück",
            next: "Weiter",
            month: "Monat",
            week: "Woche",
            day: "Tag",
            agenda: "Agenda",
            date: "Datum",
            time: "Zeit",
            event: "Buchung",
            noEventsInRange: "Keine Buchungen in diesem Zeitraum",
          }}
          formats={{
            timeGutterFormat: "HH:mm",
            eventTimeRangeFormat: ({ start, end }) =>
              `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
            agendaTimeRangeFormat: ({ start, end }) =>
              `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          }}
        />
      </div>

      {/* Booking Modal */}
      {showModal && (
        <BookingModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedSlot(null);
          }}
          selectedSlot={selectedSlot}
          carts={carts}
          users={users}
          onSubmit={handleBookingCreate}
        />
      )}
    </div>
  );
}