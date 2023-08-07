// Import types and APIs from graph-ts
import {
  ByteArray,
  crypto,
  log
} from '@graphprotocol/graph-ts'

import {
  createEventID, ROOT_NODE, EMPTY_ADDRESS,
  uint256ToByteArray, byteArrayFromHex, concat
} from './utils'

// Import event types from the registry contract ABI
import {
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
  Transfer as TransferEvent,
} from './types/BaseRegistrar/BaseRegistrar'

import {
  NameRegistered as ControllerNameRegisteredEvent,
  NameRenewed as ControllerNameRenewedEvent
} from './types/EthRegistrarController/EthRegistrarController'

// Import entity types generated from the GraphQL schema
import { Account, Domain, Registration, NameRegistered, NameRenewed, NameTransferred } from './types/schema'

var rootNode:ByteArray = byteArrayFromHex("724b2b3848e018e2643b1e22087779e04d4c860528acf6db62976c4f3d5ac502")

export function handleNameRegistered(event: NameRegisteredEvent): void {
  let account = new Account(event.params.owner.toHex())
  account.save()

  let label = uint256ToByteArray(event.params.id)
  let registration = new Registration(label.toHex())
  registration.domain = crypto.keccak256(concat(rootNode, label)).toHex()
  registration.registrationDate = event.block.timestamp
  registration.expiryDate = event.params.expires
  registration.registrant = account.id

  registration.labelName = ''
  registration.save()

  let registrationEvent = new NameRegistered(createEventID(event))
  registrationEvent.registration = registration.id
  registrationEvent.blockNumber = event.block.number.toI32()
  registrationEvent.transactionID = event.transaction.hash
  registrationEvent.registrant = account.id
  registrationEvent.expiryDate = event.params.expires
  registrationEvent.save()
}

export function handleNameRegisteredByController(event: ControllerNameRegisteredEvent): void {
    log.info(rootNode.toHexString(), []);
    log.info(event.params.label.toHexString(), []);
    log.info(crypto.keccak256(concat(rootNode, event.params.label)).toHex(), [])
  let domain = Domain.load(crypto.keccak256(concat(rootNode, event.params.label)).toHex())
    log.info("Domain loaded?", [])
  if (domain == null) {
      log.info(`DOMAIN NOT FOUND, FALLING BACK: ${event.params.name}`, [])
    domain = new Domain(crypto.keccak256(concat(rootNode, event.params.label)).toHex())
    domain.createdAt = event.block.timestamp;
    domain.owner = event.params.owner.toHexString();
    domain.labelhash = event.params.label;
    domain.isMigrated = true;
    domain.parent = rootNode.toHexString();
  }
  if(domain.labelName !== event.params.name) {
    domain.labelName = event.params.name
    domain.name = event.params.name + '.evmos'
    domain.save()
  }

  let registration = Registration.load(event.params.label.toHex());
  if(registration == null) return
  registration.labelName = event.params.name
  registration.cost = event.params.cost
  registration.save()
}

export function handleNameRenewedByController(event: ControllerNameRenewedEvent): void {
    log.info(rootNode.toHexString(), []);
    log.info(event.params.label.toHexString(), []);
    log.info(crypto.keccak256(concat(rootNode, event.params.label)).toHex(), [])
  let domain = Domain.load(crypto.keccak256(concat(rootNode, event.params.label)).toHex())
    log.info("Domain loaded?", [])
  if (domain == null) {
      log.info(`DOMAIN NOT FOUND, FALLING BACK: ${event.params.name}`, [])
    domain = new Domain(crypto.keccak256(concat(rootNode, event.params.label)).toHex())
    domain.createdAt = event.block.timestamp;
    domain.labelhash = event.params.label;
    domain.isMigrated = true;
    domain.parent = rootNode.toHexString();
  }
  if(domain.labelName !== event.params.name) {
    domain.labelName = event.params.name
    domain.name = event.params.name + '.evmos'
    domain.save()
  }

  let registration = Registration.load(event.params.label.toHex());
  if(registration == null) return
  registration.labelName = event.params.name
  registration.cost = event.params.cost
  registration.save()
}

export function handleNameRenewed(event: NameRenewedEvent): void {
  let label = uint256ToByteArray(event.params.id)
  if (label.toHex() == null)
    return;
  let registration = Registration.load(label.toHex())
  if (registration == null)
    registration = new Registration(label.toHex())
  registration.expiryDate = event.params.expires
  registration.save()

  let registrationEvent = new NameRenewed(createEventID(event))
  registrationEvent.registration = registration.id
  registrationEvent.blockNumber = event.block.number.toI32()
  registrationEvent.transactionID = event.transaction.hash
  registrationEvent.expiryDate = event.params.expires
  registrationEvent.save()
}

export function handleNameTransferred(event: TransferEvent): void {
  let account = new Account(event.params.to.toHex())
  account.save()

  let label = uint256ToByteArray(event.params.tokenId)
  let registration = Registration.load(label.toHex())
  if(registration == null) return;

  registration.registrant = account.id
  registration.save()

  let transferEvent = new NameTransferred(createEventID(event))
  transferEvent.registration = label.toHex()
  transferEvent.blockNumber = event.block.number.toI32()
  transferEvent.transactionID = event.transaction.hash
  transferEvent.newOwner = account.id
  transferEvent.save()
}
