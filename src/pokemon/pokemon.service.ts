import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isMongoId } from 'class-validator';
import { isValidObjectId, Model } from 'mongoose';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {
	private defaultLimit: number;
	constructor(
		@InjectModel(Pokemon.name)
		private readonly pokemonModel: Model<Pokemon>,

		private readonly configService: ConfigService,
	) {
		this.defaultLimit = configService.get<number>('defaultLimit');
		console.log(this.defaultLimit);
	}

	async create(createPokemonDto: CreatePokemonDto) {
		createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase();

		try {
			const pokemon = await this.pokemonModel.create(createPokemonDto);
			return pokemon;
		} catch (error) {
			this.handleExceptions(error);
		}
	}

	async findAll(paginationDto: PaginationDto) {
		const { limit = this.defaultLimit, offset = 0 } = paginationDto;

		let pokemon: Pokemon[];
		pokemon = await this.pokemonModel
			.find({})
			.limit(limit)
			.skip(offset)
			.sort({
				no: 1,
			})
			.select('-__v');
		return pokemon;
	}

	async findOne(term: string) {
		let pokemon: Pokemon;

		if (!isNaN(+term)) {
			pokemon = await this.pokemonModel.findOne({
				no: term,
			});
		}

		if (!pokemon && isValidObjectId(term)) {
			pokemon = await this.pokemonModel.findById(term);
		}

		if (!pokemon) {
			pokemon = await this.pokemonModel.findOne({
				name: term,
			});
		}

		if (!pokemon)
			throw new NotFoundException(
				`Pokemon with id, name or no "${term} not found"`,
			);

		return pokemon;
	}

	async update(term: string, updatePokemonDto: UpdatePokemonDto) {
		const pokemon = await this.findOne(term);

		if (pokemon.no === updatePokemonDto.no) {
			throw new BadRequestException(
				`Value of ${updatePokemonDto.no} is duplicated`,
			);
		}

		if (updatePokemonDto.name)
			updatePokemonDto.name = updatePokemonDto.name.toLowerCase();

		try {
			await pokemon.updateOne(updatePokemonDto);

			return { ...pokemon.toJSON(), ...updatePokemonDto };
		} catch (error) {
			this.handleExceptions(error);
		}
	}

	private handleExceptions(error: any) {
		if (error.code === 11000)
			throw new BadRequestException(
				`Pokemon exists in db ${JSON.stringify(error.keyValue)}`,
			);
		throw new InternalServerErrorException(
			`Can't create Pokemon - Check server logs`,
		);
	}

	async remove(id: string) {
		// const pokemon = await this.findOne(id);
		// await pokemon.deleteOne();
		//const result = await this.pokemonModel.findByIdAndDelete(id);
		const { deletedCount, acknowledged } =
			await this.pokemonModel.deleteOne({ _id: id });

		if (deletedCount === 0)
			throw new BadRequestException(`Pokemon with id "${id}" not found`);

		return;
	}
}
