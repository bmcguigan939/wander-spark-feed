import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  travellerName: string
  dealTitle: string
  businessName: string
  reviewUrl: string
}

export const ReviewPromptEmail = ({ travellerName, dealTitle, businessName, reviewUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>How was {dealTitle}? Tap a star — takes 2 seconds.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>How was your trip?</Heading>
        <Text style={text}>
          Hi {travellerName}, hope you had a great time at <strong>{dealTitle}</strong> with{' '}
          <strong>{businessName}</strong>. Tap a star — it takes 2 seconds, and your honest
          review helps other travellers and rewards great creators.
        </Text>
        <Button style={button} href={reviewUrl}>Rate your trip</Button>
        <Text style={footer}>
          You're receiving this because you completed a booking on Travidz. Manage email
          preferences from Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReviewPromptEmail