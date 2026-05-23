import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
  Link,
} from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer, link } from './_brand'

export interface BusinessInviteEmailProps {
  businessName: string
  creatorName: string
  subject: string
  bodyText: string
  inviteUrl: string
  termsUrl?: string
  siteName?: string
}

export const BusinessInviteEmail = ({
  businessName,
  creatorName,
  subject,
  bodyText,
  inviteUrl,
  termsUrl = 'https://travidz.com/legal/business-agreement',
  siteName = 'Travidz',
}: BusinessInviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {creatorName} featured {businessName} on {siteName} — claim your listing
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>{siteName}</Text>
        <Heading style={h1}>{subject}</Heading>
        {bodyText.split('\n').map((line, i) =>
          line.trim().length === 0 ? (
            <div key={i} style={{ height: 10 }} />
          ) : (
            <Text key={i} style={text}>
              {line}
            </Text>
          ),
        )}
        <Button style={button} href={inviteUrl}>
          Claim your listing
        </Button>
        <Text style={text}>
          Before you accept, you can read the full terms here:{' '}
          <Link href={termsUrl} style={link}>
            Travidz Business Agreement
          </Link>
          . By clicking <strong>Accept</strong> on the invite page, you agree to
          these terms.
        </Text>
        <Text style={text}>
          After accepting, you'll be guided to set a password for your free
          Travidz business account (your email is already on file), or simply
          log in if you already have one — you'll see this new listing and
          contract waiting for you.
        </Text>
        <Hr style={{ borderColor: '#f0e4d6', margin: '24px 0' }} />
        <Text style={footer}>
          Replies to this email are managed inside {siteName}. To reply to{' '}
          {creatorName}, open the link above and use the conversation panel —
          every message is saved as part of the deal record.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BusinessInviteEmail