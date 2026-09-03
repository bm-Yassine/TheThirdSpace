import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Privacy policy and terms.
 *
 * Written to describe what the app actually does rather than as boilerplate,
 * because an inaccurate policy is worse than none. It has not been reviewed by
 * a lawyer — see the note at the top of the file in the repository README.
 */

const LAST_UPDATED = '3 September 2026';
const CONTACT = 'dev.be.yassine@gmail.com';

type Section = { heading: string; body: string[] };

const PRIVACY: Section[] = [
  {
    heading: 'What we collect',
    body: [
      'Account: your email address and the name you choose. Your password is handled by Firebase Authentication and is never visible to us.',
      'Profile: anything you add — a bio, interests, and a profile photo if you upload one.',
      'Events: the events you create, including their location, and the events you join, favourite or are waitlisted for.',
      'Messages: the content of messages you send to other users.',
      'Ratings: the qualities and star ratings you give and receive after an event.',
      'Payments: if you pay for an event, Stripe processes the card details. We never see or store your card number. We keep a record that a payment happened, its amount, and which event it was for.',
    ],
  },
  {
    heading: 'What we do not collect',
    body: [
      'We do not track your location in the background. A location is attached to an event only when you choose a place while creating one.',
      'We do not sell your data, and we do not share it with advertisers.',
      'We do not use third-party analytics or advertising trackers.',
    ],
  },
  {
    heading: 'Who can see what',
    body: [
      'Your name, profile photo, bio, interests and reputation are visible to other signed-in users.',
      'Events are public — anyone can browse them, including people without an account.',
      'The list of who is attending an event is visible to that event’s organizer.',
      'Messages are visible only to you and the person you are messaging.',
      'Reports you file are not visible to the person you report.',
    ],
  },
  {
    heading: 'Where your data is held',
    body: [
      'The app runs on Google Firebase (authentication, database and file storage) and is hosted on Vercel. Payments are processed by Stripe. Map tiles and place search come from OpenStreetMap.',
      'Data may be stored on servers outside your country, including in the United States, under those providers’ own data protection commitments.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can see and edit your profile data at any time from the Profile screen.',
      'You can delete your account from Profile → Delete my account. This removes your profile, your events, your messages, your ratings and your uploaded files. It cannot be undone.',
      'If you are in the EU or UK, you also have the right to request a copy of your data, to object to processing, and to complain to your national data protection authority.',
      `For anything else, contact ${CONTACT}.`,
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'Your data is kept while your account exists. Deleting your account removes it.',
      'Payment records may be retained by Stripe for as long as their own legal and accounting obligations require.',
    ],
  },
];

const TERMS: Section[] = [
  {
    heading: 'Using the app',
    body: [
      'You must be 18 or over to use The Third Space.',
      'You are responsible for what you post and for how you behave at events, both online and in person.',
      'Do not post content that is illegal, hateful, harassing, or that impersonates someone else.',
    ],
  },
  {
    heading: 'Meeting people',
    body: [
      'Events are arranged between users. We do not vet organizers or attendees, and we do not verify that an event will take place as described.',
      'Use your judgement when meeting people you do not know. Meet in public where you can, and tell someone where you are going.',
      'You can report an event or a person from the app, and block anyone you do not want to hear from.',
    ],
  },
  {
    heading: 'Organizing an event',
    body: [
      'If you create an event, you are responsible for it: for the accuracy of the details, for turning up, and for anything you charge.',
      'If you cancel, everyone who joined is notified automatically.',
      'You are responsible for holding the rights to any photo, video or music you upload.',
    ],
  },
  {
    heading: 'Payments',
    body: [
      'Paid events are processed by Stripe. Your place is held as pending until payment completes.',
      'Refunds are between you and the organizer. We do not currently process refunds automatically.',
    ],
  },
  {
    heading: 'Ending your account',
    body: [
      'You can delete your account at any time from the Profile screen.',
      'We may suspend an account that breaks these terms or that is reported for harmful behaviour.',
    ],
  },
  {
    heading: 'No warranty',
    body: [
      'The app is provided as is. It is an independent project, not a company, and it may change or become unavailable.',
    ],
  },
];

export default function LegalScreen() {
  const params = useLocalSearchParams();
  const initialTab = String(params.tab || 'privacy') === 'terms' ? 'terms' : 'privacy';
  const [tab, setTab] = React.useState<'privacy' | 'terms'>(initialTab);

  const sections = tab === 'privacy' ? PRIVACY : TERMS;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy & Terms</Text>
      </View>

      <View style={styles.tabs}>
        {(['privacy', 'terms'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>

        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.body.map((paragraph, index) => (
              <Text key={index} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.footer}>
          The Third Space is an independent project. Questions about your data can go to{' '}
          {CONTACT}.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
  },
  iconBtn: { padding: 6, borderRadius: 999 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  tabTextActive: { color: '#fff' },

  content: { padding: 20, paddingBottom: 60 },
  updated: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },

  section: { marginBottom: 22 },
  heading: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  paragraph: { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 8 },

  footer: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
});
