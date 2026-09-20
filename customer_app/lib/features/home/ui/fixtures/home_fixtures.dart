// UI-only fixture.
// Replace with repository data when backend integration begins.

class UpcomingVisitFixture {
  const UpcomingVisitFixture({
    required this.masterName,
    required this.serviceName,
    required this.dateText,
    required this.timeText,
    required this.imageUrl,
  });

  final String masterName;
  final String serviceName;
  final String dateText;
  final String timeText;
  final String imageUrl;
}

class MasterPreviewFixture {
  const MasterPreviewFixture({
    required this.id,
    required this.name,
    required this.title,
    required this.nextAvailable,
    required this.imageUrl,
  });

  final String id;
  final String name;
  final String title;
  final String nextAvailable;
  final String imageUrl;
}

class GalleryItemFixture {
  const GalleryItemFixture({required this.caption, required this.imageUrl});

  final String caption;
  final String imageUrl;
}

class ServiceItemFixture {
  const ServiceItemFixture({required this.id, required this.title});

  final String id;
  final String title;
}

class LoungeLocationFixture {
  const LoungeLocationFixture({
    required this.address,
    required this.city,
    required this.hours,
  });

  final String address;
  final String city;
  final String hours;
}

abstract final class HomeFixtures {
  static const upcomingVisit = UpcomingVisitFixture(
    masterName: 'Master Daban',
    serviceName: 'Grooming & Hair Style',
    dateText: 'TUE 15 SEP',
    timeText: '3:00 PM',
    imageUrl: 'http://localhost:3845/assets/57ecab2d948a8def795dfb6481ef1c814b705222.png',
  );

  static const masters = [
    MasterPreviewFixture(
      id: '1',
      name: 'Daban',
      title: 'Master Barber',
      nextAvailable: 'Today · 5:30 PM',
      imageUrl: 'http://localhost:3845/assets/57ecab2d948a8def795dfb6481ef1c814b705222.png',
    ),
    MasterPreviewFixture(
      id: '2',
      name: 'Shankar',
      title: 'Master Grooming Specialist',
      nextAvailable: 'Tomorrow · 11:00 AM',
      imageUrl: 'http://localhost:3845/assets/e4f6538684d94c27540c6f509084772c8c9b0b65.png',
    ),
    MasterPreviewFixture(
      id: '3',
      name: 'Mohammed',
      title: 'Master Barber',
      nextAvailable: 'Today · 7:00 PM',
      imageUrl: 'http://localhost:3845/assets/68d362cd6b47bd2ba9e26d7c8e77d0f64caca907.png',
    ),
  ];

  static const gallery = [
    GalleryItemFixture(
      caption: 'The room',
      imageUrl: 'http://localhost:3845/assets/d8ff5164b93c7b97e6d018913c257edecb847da8.png',
    ),
    GalleryItemFixture(
      caption: 'The cut',
      imageUrl: 'http://localhost:3845/assets/8147f03b9878121919ade7a2119cf617c4ce1d82.png',
    ),
    GalleryItemFixture(
      caption: 'The chair',
      imageUrl: 'http://localhost:3845/assets/865fc8ca7dd759991989f55f35bd2bc2d7efa6c6.png',
    ),
    GalleryItemFixture(
      caption: 'The finish',
      imageUrl: 'http://localhost:3845/assets/1b50c84d8449088906824a3df13b34f31408bd13.png',
    ),
  ];

  static const services = [
    ServiceItemFixture(id: 'haircut', title: 'Haircut'),
    ServiceItemFixture(id: 'grooming', title: 'Grooming & Hair Style'),
    ServiceItemFixture(id: 'beard', title: 'Beard Grooming'),
    ServiceItemFixture(id: 'facial', title: 'Facial Care'),
    ServiceItemFixture(id: 'skin', title: 'Skin Care'),
    ServiceItemFixture(id: 'styling', title: 'Hair Styling'),
  ];

  static const loungeCardImage =
      'http://localhost:3845/assets/851ef12b7d96cc94608557f3c32bba00cfa85979.png';

  static const location = LoungeLocationFixture(
    address: 'Al-Mansour, 14th Ramadan St.',
    city: 'Baghdad',
    hours: '09:00 — 20:00 · Daily',
  );
}
